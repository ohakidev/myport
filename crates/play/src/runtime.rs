use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

use js_sys::Reflect;
use serde_json::json;
use wasm_bindgen::{JsCast, JsValue, closure::Closure, prelude::wasm_bindgen};
use web_sys::{
    Element, Event, EventTarget, HtmlCanvasElement, HtmlElement, KeyboardEvent, MediaQueryList,
    MouseEvent, PointerEvent, Storage, Window,
};

use crate::{
    model::{
        GameAction, GameModel, GardenPreferences, LEGACY_KEY, PREFERENCES_KEY, ProjectRef,
        SESSION_KEY, TARGET_COUNT, normalize_save, serialize_legacy_completions, serialize_save,
        station_position,
    },
    renderer::Renderer,
};

#[derive(Clone, Copy, Debug, Hash, PartialEq, Eq)]
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

impl Direction {
    fn from_action(action: GameAction) -> Option<Self> {
        match action {
            GameAction::Up => Some(Self::Up),
            GameAction::Down => Some(Self::Down),
            GameAction::Left => Some(Self::Left),
            GameAction::Right => Some(Self::Right),
            _ => None,
        }
    }

    fn from_key(key: &str) -> Option<Self> {
        match key {
            "w" | "W" | "ArrowUp" => Some(Self::Up),
            "s" | "S" | "ArrowDown" => Some(Self::Down),
            "a" | "A" | "ArrowLeft" => Some(Self::Left),
            "d" | "D" | "ArrowRight" => Some(Self::Right),
            _ => None,
        }
    }

    fn vector(self) -> [f32; 2] {
        match self {
            Self::Up => [0.0, 1.0],
            Self::Down => [0.0, -1.0],
            Self::Left => [-1.0, 0.0],
            Self::Right => [1.0, 0.0],
        }
    }
}

#[derive(Clone, Copy)]
struct Destination {
    position: [f32; 2],
    target: Option<u8>,
    begin_project: Option<usize>,
}

struct PointerPress {
    direction: Direction,
    moved: f32,
}

struct RegisteredListener {
    target: EventTarget,
    name: &'static str,
    callback: Closure<dyn FnMut(Event)>,
}

struct GameRuntime {
    root: Element,
    canvas: HtmlCanvasElement,
    status: HtmlElement,
    progress_label: Option<HtmlElement>,
    progress_meter: Option<HtmlElement>,
    begin_button: Option<HtmlElement>,
    next_target_button: Option<HtmlElement>,
    light_button: Option<HtmlElement>,
    motion_button: Option<HtmlElement>,
    window: Window,
    media_query: MediaQueryList,
    storage: Option<Storage>,
    storage_available: bool,
    preferences: GardenPreferences,
    system_reduced_motion: bool,
    model: GameModel,
    renderer: Renderer,
    pressed_keys: HashSet<Direction>,
    pressed_pointers: HashMap<i32, PointerPress>,
    last_contact: Option<u8>,
    destination: Option<Destination>,
    last_frame: Option<f64>,
    elapsed: f32,
    viewport: (i32, i32, f32),
    raf_id: Option<i32>,
    effect_bursts: u32,
}

type RenderHook = Closure<dyn FnMut() -> String>;
type AdvanceHook = Closure<dyn FnMut(f64)>;

thread_local! {
    static RUNTIME: RefCell<Option<GameRuntime>> = const { RefCell::new(None) };
    static LISTENERS: RefCell<Vec<RegisteredListener>> = const { RefCell::new(Vec::new()) };
    static RAF_CALLBACK: RefCell<Option<Closure<dyn FnMut(f64)>>> = const { RefCell::new(None) };
    static RENDER_HOOK: RefCell<Option<RenderHook>> = const { RefCell::new(None) };
    static ADVANCE_HOOK: RefCell<Option<AdvanceHook>> = const { RefCell::new(None) };
}

pub(crate) fn initialize() -> Result<(), JsValue> {
    if RUNTIME.with(|runtime| {
        runtime
            .borrow()
            .as_ref()
            .is_some_and(|game| game.root.is_connected())
    }) {
        return Ok(());
    }
    dispose_runtime();

    let runtime = GameRuntime::mount()?;
    let root = runtime.root.clone();
    let canvas = runtime.canvas.clone();
    let window = runtime.window.clone();
    let media_query = runtime.media_query.clone();
    RUNTIME.with(|slot| *slot.borrow_mut() = Some(runtime));

    if let Err(error) = register_events(root, canvas, window.clone(), media_query)
        .and_then(|()| install_state_hooks(&window))
    {
        dispose_runtime();
        return Err(error);
    }

    with_runtime(|game| {
        game.present(false);
        game.resize();
        game.render();
    });
    if let Err(error) = schedule_frame() {
        dispose_runtime();
        return Err(error);
    }
    Ok(())
}

#[wasm_bindgen]
pub fn init() -> Result<(), JsValue> {
    initialize()
}

#[wasm_bindgen]
pub fn dispose() {
    dispose_runtime();
}

impl GameRuntime {
    fn mount() -> Result<Self, JsValue> {
        let window = web_sys::window()
            .ok_or_else(|| JsValue::from_str("The browser window is unavailable."))?;
        let document = window
            .document()
            .ok_or_else(|| JsValue::from_str("The page document is unavailable."))?;
        let root = document
            .get_element_by_id("play-root")
            .ok_or_else(|| JsValue::from_str("The interactive scene shell was not found."))?;
        let canvas = document
            .get_element_by_id("play-canvas")
            .ok_or_else(|| JsValue::from_str("The interactive scene canvas was not found."))?
            .dyn_into::<HtmlCanvasElement>()?;
        let status = document
            .get_element_by_id("play-status")
            .ok_or_else(|| JsValue::from_str("The live game status region was not found."))?
            .dyn_into::<HtmlElement>()?;
        let progress_label = optional_element(&document, "play-progress");
        let progress_meter = optional_element(&document, "play-chapter-progress");
        let begin_button = optional_element(&document, "play-begin");
        let next_target_button = optional_element(&document, "play-next-target");
        let light_button = optional_element(&document, "play-light");
        let motion_button = optional_element(&document, "play-motion");
        canvas.set_tab_index(0);
        if canvas.get_attribute("aria-label").is_none() {
            canvas.set_attribute("aria-label", "Playable isometric garden. Move with WASD or arrow keys; use the chapter controls to explore.")?;
        }

        let project_json = root
            .get_attribute("data-projects")
            .unwrap_or_else(|| "[]".into());
        let projects: Vec<ProjectRef> = serde_json::from_str(&project_json)
            .map_err(|_| JsValue::from_str("Project details could not be read."))?;
        let storage = window.local_storage().ok().flatten();
        let (session_raw, legacy_raw, preferences_raw, storage_available) =
            read_storage(storage.as_ref());
        let save = normalize_save(session_raw.as_deref(), legacy_raw.as_deref(), &projects);
        let preferences = GardenPreferences::parse(preferences_raw.as_deref());
        let media_query = window
            .match_media("(prefers-reduced-motion: reduce)")?
            .ok_or_else(|| JsValue::from_str("The browser motion preference could not be read."))?;
        let system_reduced_motion = media_query.matches();
        let mut model = GameModel::new(
            projects,
            save,
            storage_available,
            system_reduced_motion,
            preferences.full_effects,
            preferences.evening,
        );
        model.storage_available = storage_available;
        let renderer = Renderer::new(&canvas, model.projects.len())?;

        Ok(Self {
            root,
            canvas,
            status,
            progress_label,
            progress_meter,
            begin_button,
            next_target_button,
            light_button,
            motion_button,
            window,
            media_query,
            storage,
            storage_available,
            preferences,
            system_reduced_motion,
            model,
            renderer,
            pressed_keys: HashSet::new(),
            pressed_pointers: HashMap::new(),
            last_contact: None,
            destination: None,
            last_frame: None,
            elapsed: 0.0,
            viewport: (-1, -1, f32::NAN),
            raf_id: None,
            effect_bursts: 0,
        })
    }

    fn resize(&mut self) {
        let width = self.canvas.client_width();
        let height = self.canvas.client_height();
        let ratio = self.window.device_pixel_ratio().clamp(1.0, 2.0) as f32;
        if self.viewport != (width, height, ratio) {
            self.renderer.resize(&self.canvas, ratio);
            self.viewport = (width, height, ratio);
        }
    }

    fn render(&self) {
        let walking = !self.pressed_keys.is_empty()
            || !self.pressed_pointers.is_empty()
            || self.destination.is_some();
        let jump = if walking && self.model.full_effects {
            (self.elapsed * 7.0).sin().abs() * 0.08
        } else {
            0.0
        };
        self.renderer.render(&self.model, self.elapsed, jump);
    }

    fn step(&mut self, delta: f32) {
        let before_nearby = self.model.nearby;
        let before_active = self.model.active;
        let before_progress = self.model.progress;
        let before_carrying = self.model.carrying;
        let before_collected = self.model.collected.clone();
        let before_completed = self.model.completed.clone();
        let before_resumable = self.model.resumable.clone();
        let before_message = self.model.message.clone();
        self.elapsed += delta;

        let direction = self.movement_vector();
        if direction != [0.0, 0.0] {
            self.destination = None;
            let before = self.model.player;
            self.model.move_player(direction[0], direction[1], delta);
            let traveled =
                (self.model.player[0] - before[0]).hypot(self.model.player[1] - before[1]);
            for pointer in self.pressed_pointers.values_mut() {
                pointer.moved += traveled;
            }
        } else if let Some(destination) = self.destination {
            let dx = destination.position[0] - self.model.player[0];
            let dz = destination.position[1] - self.model.player[1];
            let distance = dx.hypot(dz);
            let travel = delta.clamp(0.0, 0.05) * 10.0;
            if distance <= travel || distance < 0.08 {
                self.model.player = destination.position;
                self.model.refresh_nearby();
                self.destination = None;
                if let Some(target) = destination.target {
                    self.last_contact = Some(target);
                    self.model.step_target(target);
                }
                if let Some(project) = destination.begin_project {
                    self.model.begin_project(project);
                }
            } else if distance > 0.0 {
                self.model.move_player(dx / distance, dz / distance, delta);
            }
        }

        let contact = self.next_contact();
        if contact != self.last_contact {
            if let Some(target) = contact {
                if self
                    .destination
                    .is_some_and(|destination| destination.target == Some(target))
                {
                    self.destination = self.destination.map(|mut destination| {
                        destination.target = None;
                        destination
                    });
                }
                self.model.step_target(target);
            }
            self.last_contact = contact;
        }

        let save_changed = self.model.active != before_active
            || self.model.progress != before_progress
            || self.model.carrying != before_carrying
            || self.model.collected != before_collected
            || self.model.completed != before_completed
            || self.model.resumable != before_resumable;
        let status_changed =
            self.model.message != before_message || self.model.nearby != before_nearby;
        if self.model.progress > before_progress
            || self.model.carrying != before_carrying
            || self.model.completed.len() > before_completed.len()
        {
            self.effect_bursts = self.effect_bursts.saturating_add(1);
        }
        if save_changed || status_changed {
            self.present(save_changed);
        }
    }

    fn movement_vector(&self) -> [f32; 2] {
        let mut vector = [0.0, 0.0];
        for direction in self
            .pressed_keys
            .iter()
            .chain(self.pressed_pointers.values().map(|press| &press.direction))
        {
            let movement = direction.vector();
            vector[0] += movement[0];
            vector[1] += movement[1];
        }
        let length = vector[0].hypot(vector[1]);
        if length > 1.0 {
            vector[0] /= length;
            vector[1] /= length;
        }
        vector
    }

    fn next_contact(&self) -> Option<u8> {
        let mode = self.model.mode()?;
        let targets: &[u8] = match mode {
            crate::model::GameMode::Collect => &[0, 1, 2],
            crate::model::GameMode::Sequence => &[0, 1, 2],
            crate::model::GameMode::Deliver => &[0, 2],
        };
        targets.iter().copied().find(|target| {
            if mode == crate::model::GameMode::Collect && self.model.collected.contains(target) {
                return false;
            }
            self.model.target_position(*target).is_some_and(|position| {
                (self.model.player[0] - position[0]).hypot(self.model.player[1] - position[1]) < 0.9
            })
        })
    }

    fn present(&mut self, persist: bool) {
        if persist {
            self.persist();
        }
        self.model.storage_available = self.storage_available;
        let status = if self.storage_available {
            self.model.message.clone()
        } else {
            format!("{} Progress lasts for this visit only.", self.model.message)
        };
        self.status.set_text_content(Some(&status));
        let chapter_progress = self.model.chapter_progress();
        if let Some(progress) = &self.progress_label {
            let label = match chapter_progress {
                Some(value) if self.model.completed_project.is_some() => {
                    format!("Complete · {value}/{TARGET_COUNT}")
                }
                Some(value) if self.model.active.is_some() => {
                    format!("{value}/{TARGET_COUNT}")
                }
                Some(value) => format!("Paused · {value}/{TARGET_COUNT}"),
                None => "Explore".into(),
            };
            progress.set_text_content(Some(&label));
        }
        if let Some(progress) = &self.progress_meter {
            if let Some(value) = chapter_progress {
                progress.set_attribute("value", &value.to_string()).ok();
                progress.remove_attribute("hidden").ok();
            } else {
                progress.set_attribute("hidden", "").ok();
            }
        }
        self.set_attribute(
            "data-active",
            self.model.active.map_or(-1, |index| index as i32),
        );
        self.set_attribute("data-progress", self.model.progress);
        self.set_attribute(
            "data-collected",
            &self
                .model
                .collected
                .iter()
                .map(u8::to_string)
                .collect::<Vec<_>>()
                .join(","),
        );
        self.set_attribute("data-completed", self.model.completed.len());
        self.set_attribute(
            "data-completed-project",
            self.model
                .completed_project
                .map_or(-1, |index| index as i32),
        );
        self.set_attribute("data-resumable", self.model.resumable.is_some());
        let resume_index = self.model.resumable.as_ref().and_then(|save| {
            self.model
                .projects
                .iter()
                .position(|project| project.name == save.project)
        });
        self.set_attribute(
            "data-resume-project",
            resume_index.map_or(-1, |index| index as i32),
        );
        self.set_attribute(
            "data-nearby",
            self.model
                .nearby
                .map_or_else(String::new, |index| self.model.projects[index].name.clone()),
        );
        self.set_attribute("data-storage", self.storage_available);
        self.set_attribute(
            "data-lighting",
            if self.model.evening { "evening" } else { "day" },
        );
        self.set_attribute(
            "data-motion",
            if self.model.full_effects {
                "full"
            } else {
                "reduced"
            },
        );
        self.set_attribute("data-effect-bursts", self.effect_bursts);
        self.set_attribute("data-effect-particles", 0);
        let begin = if self.model.resumable.is_some() {
            if resume_index.is_some() {
                ("Resume story", Some("resume"), false)
            } else {
                ("Saved story unavailable", None, true)
            }
        } else if self.model.active.is_some() {
            ("Chapter in progress", None, true)
        } else if self.model.nearby.is_some() {
            ("Begin chapter", Some("begin"), false)
        } else {
            ("Choose a workshop", None, true)
        };
        set_button_state(&self.begin_button, begin.0, begin.1, begin.2);
        let next = self.model.active.map(|_| {
            let label = match self.model.mode() {
                Some(crate::model::GameMode::Collect) => {
                    format!("Collect idea {}", self.model.next_target() + 1)
                }
                Some(crate::model::GameMode::Sequence) => {
                    format!("Connect pad {}", self.model.next_target() + 1)
                }
                Some(crate::model::GameMode::Deliver) if self.model.carrying => {
                    "Go to display stand".into()
                }
                Some(crate::model::GameMode::Deliver) => "Go to book tray".into(),
                None => "Choose a chapter".into(),
            };
            let target = format!("target-{}", self.model.next_target());
            (label, target)
        });
        if let Some(button) = &self.next_target_button {
            if let Some((label, action)) = next {
                set_button_state_value(button, &label, Some(&action), false);
            } else {
                set_button_state_value(button, "Next step", None, true);
            }
        }
        set_button_state(
            &self.light_button,
            if self.model.evening {
                "Switch to daylight"
            } else {
                "Switch to evening"
            },
            Some("light"),
            false,
        );
        set_button_state(
            &self.motion_button,
            if self.model.full_effects {
                "Enable calm mode"
            } else {
                "Enable full effects"
            },
            Some("motion"),
            false,
        );
        set_button_pressed(&self.light_button, self.model.evening);
        set_button_pressed(&self.motion_button, self.model.full_effects);
        self.update_position_attributes();
    }

    fn update_position_attributes(&self) {
        self.set_attribute("data-player-x", format!("{:.3}", self.model.player[0]));
        self.set_attribute("data-player-z", format!("{:.3}", self.model.player[1]));
        self.set_attribute(
            "data-gesture",
            if self.movement_vector() == [0.0, 0.0] && self.destination.is_none() {
                "idle"
            } else {
                "walk"
            },
        );
    }

    fn set_attribute(&self, name: &str, value: impl ToString) {
        let _ = self.root.set_attribute(name, &value.to_string());
    }

    fn persist(&mut self) {
        let Some(storage) = self.storage.as_ref() else {
            self.storage_available = false;
            return;
        };
        let session = serialize_save(&self.model.save());
        let legacy = serialize_legacy_completions(&self.model.completed);
        let preferences = self.preferences.serialize();
        let stored = storage
            .set_item(SESSION_KEY, &session)
            .and_then(|()| storage.set_item(LEGACY_KEY, &legacy))
            .and_then(|()| storage.set_item(PREFERENCES_KEY, &preferences));
        if stored.is_err() {
            self.storage_available = false;
        }
    }

    fn render_state(&self) -> String {
        let mode = if self.model.active.is_some() {
            "chapter"
        } else if self.model.started {
            "exploring"
        } else {
            "intro"
        };
        let targets = (0..3_u8)
            .map(|target| match self.model.mode() {
                Some(crate::model::GameMode::Collect | crate::model::GameMode::Sequence) => {
                    !self.model.collected.contains(&target)
                }
                Some(crate::model::GameMode::Deliver) => true,
                None => false,
            })
            .collect::<Vec<_>>();
        let state = json!({
            "mode": mode,
            "player": { "x": round(self.model.player[0]), "z": round(self.model.player[1]) },
            "nearbyProject": self.model.nearby.map(|index| self.model.projects[index].name.as_str()),
            "activeProject": self.model.active_name(),
            "progress": self.model.progress,
            "carrying": self.model.carrying,
            "collected": self.model.collected,
            "targetFocus": self.model.active.map(|_| self.model.next_target()),
            "visibleTargets": targets,
            "destination": self.destination.map(|destination| json!({ "x": round(destination.position[0]), "z": round(destination.position[1]) })),
            "completed": self.model.completed,
            "resumable": self.model.resumable.is_some(),
            "reducedMotion": !self.model.full_effects,
            "lighting": if self.model.evening { "evening" } else { "day" },
            "status": self.model.message,
            "coordinateNote": "world origin is the entry point; +x and +z increase world coordinates",
        });
        state.to_string()
    }

    fn start(&mut self) {
        self.model.started = true;
        if self.model.resumable.is_none() {
            self.model.message =
                "Move with WASD or arrows. Reach a workshop and press E to begin its story.".into();
        }
        self.present(false);
    }

    fn interact(&mut self) {
        if let Some(active) = self.model.active {
            let target = self.model.next_target();
            if let Some(position) = self.model.target_position(target) {
                self.destination = Some(Destination {
                    position,
                    target: Some(target),
                    begin_project: None,
                });
                self.model.message = format!(
                    "Heading to marker {} for {}.",
                    target + 1,
                    self.model.projects[active].name
                );
                self.present(false);
            }
        } else {
            self.model.begin();
            self.present(true);
        }
    }

    fn go_to_target(&mut self, target: u8) {
        if let Some(position) = self.model.target_position(target) {
            self.destination = Some(Destination {
                position,
                target: Some(target),
                begin_project: None,
            });
            self.model.message = format!("Walking to marker {}.", target + 1);
            self.present(false);
        } else {
            self.model.step_target(target);
            self.present(false);
        }
    }

    fn go_to_project(&mut self, index: usize, begin_when_arrived: bool) {
        let Some(project_name) = self
            .model
            .projects
            .get(index)
            .map(|project| project.name.clone())
        else {
            self.model.message = "That project marker is unavailable.".into();
            self.present(false);
            return;
        };
        if self.model.resumable.is_some() {
            self.model.message =
                "Resume or discard the saved story before visiting another workshop.".into();
            self.present(false);
            return;
        }
        if self.model.active.is_some() {
            self.model.message =
                "Finish or leave the current chapter before visiting another workshop.".into();
            self.present(false);
            return;
        }
        let [x, z] = station_position(index);
        self.destination = Some(Destination {
            position: [x, z + 4.5],
            target: None,
            begin_project: begin_when_arrived.then_some(index),
        });
        self.model.message = if begin_when_arrived {
            format!("Walking to {project_name}. Its chapter starts when you arrive.")
        } else {
            format!("Walking to {project_name}. Begin its chapter when you arrive.")
        };
        self.model.started = true;
        self.present(false);
    }

    fn go_to_next_project(&mut self) {
        let completed = self.model.completed_project;
        self.model.advance_after_completion();
        let Some(completed) = completed else {
            self.present(false);
            return;
        };
        let project_count = self.model.projects.len();
        let next = (1..=project_count)
            .map(|offset| (completed + offset) % project_count)
            .find(|index| {
                !self
                    .model
                    .completed
                    .contains(&self.model.projects[*index].name)
            });
        if let Some(index) = next {
            let [x, z] = station_position(index);
            self.destination = Some(Destination {
                position: [x, z + 4.5],
                target: None,
                begin_project: None,
            });
            self.model.message = format!(
                "Walking toward {}. Begin its chapter when you arrive.",
                self.model.projects[index].name
            );
        } else {
            self.model.message =
                "All current chapters are complete. Keep exploring or read the work.".into();
        }
        self.present(false);
    }

    fn apply_action(&mut self, action: GameAction) {
        if let Some(direction) = Direction::from_action(action) {
            let vector = direction.vector();
            self.destination = None;
            self.model.move_player(vector[0], vector[1], 0.18);
            self.present(false);
            return;
        }
        match action {
            GameAction::Start => self.start(),
            GameAction::Begin => {
                self.model.begin();
                self.present(true);
            }
            GameAction::Next => self.go_to_next_project(),
            GameAction::Target(target) => self.go_to_target(target),
            GameAction::Visit(index) => self.go_to_project(index, true),
            GameAction::Workshop(index) => self.go_to_project(index, false),
            GameAction::Resume => {
                let project = self.model.resumable.as_ref().and_then(|save| {
                    self.model
                        .projects
                        .iter()
                        .position(|project| project.name == save.project)
                });
                self.model.resume();
                if let Some(index) = project {
                    let [x, z] = station_position(index);
                    self.model.player = [x, z + 4.5];
                    self.model.refresh_nearby();
                }
                self.present(true);
            }
            GameAction::Cancel => {
                self.destination = None;
                self.model.cancel();
                self.present(true);
            }
            GameAction::Discard => {
                self.model.discard_saved();
                self.present(true);
            }
            GameAction::Light => {
                self.model.toggle_light();
                self.preferences.evening = self.model.evening;
                self.present(true);
            }
            GameAction::MotionToggle => {
                self.model.toggle_motion();
                self.preferences.full_effects = Some(self.model.full_effects);
                self.present(true);
            }
            GameAction::MotionFull => {
                self.model.full_effects = true;
                self.model.explicit_motion_choice = true;
                self.preferences.full_effects = Some(true);
                self.model.message = "Full effects enabled for this visit.".into();
                self.present(true);
            }
            GameAction::MotionSystem => {
                self.model.full_effects = !self.system_reduced_motion;
                self.model.explicit_motion_choice = false;
                self.preferences.full_effects = None;
                self.model.message = if self.system_reduced_motion {
                    "Calm mode follows your device preference."
                } else {
                    "Motion follows your device preference."
                }
                .into();
                self.present(true);
            }
            GameAction::Up | GameAction::Down | GameAction::Left | GameAction::Right => {
                unreachable!()
            }
        }
    }
}

fn read_storage(
    storage: Option<&Storage>,
) -> (Option<String>, Option<String>, Option<String>, bool) {
    let Some(storage) = storage else {
        return (None, None, None, false);
    };
    let session = storage.get_item(SESSION_KEY);
    let legacy = storage.get_item(LEGACY_KEY);
    let preferences = storage.get_item(PREFERENCES_KEY);
    let available = session.is_ok() && legacy.is_ok() && preferences.is_ok();
    (
        session.ok().flatten(),
        legacy.ok().flatten(),
        preferences.ok().flatten(),
        available,
    )
}

fn register_listener(
    target: EventTarget,
    name: &'static str,
    handler: impl FnMut(Event) + 'static,
) -> Result<(), JsValue> {
    let callback = Closure::wrap(Box::new(handler) as Box<dyn FnMut(Event)>);
    target.add_event_listener_with_callback(name, callback.as_ref().unchecked_ref())?;
    LISTENERS.with(|listeners| {
        listeners.borrow_mut().push(RegisteredListener {
            target,
            name,
            callback,
        })
    });
    Ok(())
}

fn optional_element(document: &web_sys::Document, id: &str) -> Option<HtmlElement> {
    document
        .get_element_by_id(id)?
        .dyn_into::<HtmlElement>()
        .ok()
}

fn set_button_state(
    button: &Option<HtmlElement>,
    label: &str,
    action: Option<&str>,
    disabled: bool,
) {
    if let Some(button) = button {
        set_button_state_value(button, label, action, disabled);
    }
}

fn set_button_state_value(button: &HtmlElement, label: &str, action: Option<&str>, disabled: bool) {
    button.set_text_content(Some(label));
    button
        .set_attribute("aria-disabled", if disabled { "true" } else { "false" })
        .ok();
    if disabled {
        button.set_attribute("disabled", "").ok();
    } else {
        button.remove_attribute("disabled").ok();
    }
    if let Some(action) = action {
        button.set_attribute("data-game-action", action).ok();
    } else {
        button.remove_attribute("data-game-action").ok();
    }
}

fn set_button_pressed(button: &Option<HtmlElement>, pressed: bool) {
    if let Some(button) = button {
        button
            .set_attribute("aria-pressed", if pressed { "true" } else { "false" })
            .ok();
    }
}

fn register_events(
    root: Element,
    canvas: HtmlCanvasElement,
    window: Window,
    media_query: MediaQueryList,
) -> Result<(), JsValue> {
    let root_target = root.clone().unchecked_into::<EventTarget>();
    let click_canvas = canvas.clone();
    register_listener(root_target.clone(), "click", move |event| {
        let Some(element) = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
        else {
            return;
        };
        if let Some(control) = element.closest("[data-game-action]").ok().flatten() {
            let Some(action) = control
                .get_attribute("data-game-action")
                .as_deref()
                .and_then(GameAction::parse)
            else {
                return;
            };
            if let Some(direction) = Direction::from_action(action) {
                let pointer_click = event
                    .clone()
                    .dyn_into::<MouseEvent>()
                    .is_ok_and(|mouse| mouse.detail() > 0);
                if !pointer_click {
                    with_runtime(|game| {
                        let vector = direction.vector();
                        game.destination = None;
                        game.model.move_player(vector[0], vector[1], 0.18);
                        game.present(false);
                    });
                }
            } else {
                event.prevent_default();
                with_runtime(|game| game.apply_action(action));
            }
            return;
        }
        if element.tag_name() == "CANVAS"
            && element.get_attribute("id").as_deref() == Some("play-canvas")
        {
            let Ok(pointer) = event.clone().dyn_into::<MouseEvent>() else {
                return;
            };
            let rect = click_canvas.get_bounding_client_rect();
            if rect.width() <= 0.0 || rect.height() <= 0.0 {
                return;
            }
            let x =
                ((f64::from(pointer.client_x()) - rect.left()) / rect.width() * 2.0 - 1.0) as f32;
            let y =
                ((f64::from(pointer.client_y()) - rect.top()) / rect.height() * 2.0 - 1.0) as f32;
            with_runtime(|game| {
                let position = game.renderer.screen_to_world(x, y);
                game.destination = Some(Destination {
                    position,
                    target: None,
                    begin_project: None,
                });
                let _ = game.canvas.focus();
                game.model.message = "Walking to the marked spot.".into();
                game.present(false);
            });
        }
    })?;

    let pointer_root = root.clone();
    register_listener(root_target.clone(), "pointerdown", move |event| {
        let Some(element) = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
        else {
            return;
        };
        let Some(control) = element.closest("[data-game-action]").ok().flatten() else {
            return;
        };
        let Some(action) = control
            .get_attribute("data-game-action")
            .as_deref()
            .and_then(GameAction::parse)
        else {
            return;
        };
        let Some(direction) = Direction::from_action(action) else {
            return;
        };
        let Ok(pointer) = event.clone().dyn_into::<PointerEvent>() else {
            return;
        };
        event.prevent_default();
        with_runtime(|game| {
            game.destination = None;
            game.pressed_pointers.insert(
                pointer.pointer_id(),
                PointerPress {
                    direction,
                    moved: 0.0,
                },
            );
        });
        let _ = pointer_root.set_pointer_capture(pointer.pointer_id());
    })?;

    let pointer_window = window.clone();
    for event_name in ["pointerup", "pointercancel"] {
        let name = if event_name == "pointerup" {
            "pointerup"
        } else {
            "pointercancel"
        };
        let was_cancelled = name == "pointercancel";
        register_listener(
            pointer_window.clone().unchecked_into::<EventTarget>(),
            name,
            move |event| {
                if let Ok(pointer) = event.dyn_into::<PointerEvent>() {
                    with_runtime(|game| {
                        if let Some(press) = game.pressed_pointers.remove(&pointer.pointer_id()) {
                            if !was_cancelled && press.moved < 0.25 {
                                let vector = press.direction.vector();
                                game.model.move_player(vector[0], vector[1], 0.05);
                            }
                            game.present(false);
                        }
                    });
                }
            },
        )?;
    }

    let key_root = root.clone();
    register_listener(root_target.clone(), "keydown", move |event| {
        let Ok(keyboard) = event.clone().dyn_into::<KeyboardEvent>() else {
            return;
        };
        if event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .is_some_and(|target| {
                target
                    .closest("button, a, input, select, textarea")
                    .ok()
                    .flatten()
                    .is_some()
            })
        {
            return;
        }
        if let Some(direction) = Direction::from_key(&keyboard.key()) {
            event.prevent_default();
            with_runtime(|game| {
                game.destination = None;
                game.pressed_keys.insert(direction);
            });
        } else if matches!(keyboard.key().as_str(), "e" | "E") && !keyboard.repeat() {
            event.prevent_default();
            with_runtime(GameRuntime::interact);
        }
        let _ = key_root;
    })?;

    let key_root = root.clone();
    register_listener(root_target, "keyup", move |event| {
        let Ok(keyboard) = event.clone().dyn_into::<KeyboardEvent>() else {
            return;
        };
        if event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .is_some_and(|target| {
                target
                    .closest("button, a, input, select, textarea")
                    .ok()
                    .flatten()
                    .is_some()
            })
        {
            return;
        }
        if let Some(direction) = Direction::from_key(&keyboard.key()) {
            with_runtime(|game| {
                game.pressed_keys.remove(&direction);
            });
        }
        let _ = key_root;
    })?;

    let resize_window = window.clone();
    register_listener(
        window.clone().unchecked_into::<EventTarget>(),
        "resize",
        move |_| {
            with_runtime(|game| {
                game.resize();
                game.render();
            });
            let _ = &resize_window;
        },
    )?;
    register_listener(
        window.clone().unchecked_into::<EventTarget>(),
        "blur",
        move |_| {
            with_runtime(|game| {
                game.pressed_keys.clear();
                game.pressed_pointers.clear();
            });
        },
    )?;

    register_listener(
        media_query.clone().unchecked_into::<EventTarget>(),
        "change",
        move |_| {
            with_runtime(|game| {
                game.system_reduced_motion = game.media_query.matches();
                if !game.model.explicit_motion_choice {
                    game.model.full_effects = !game.system_reduced_motion;
                }
                game.present(false);
                game.render();
            });
        },
    )?;
    Ok(())
}

fn install_state_hooks(window: &Window) -> Result<(), JsValue> {
    let render = Closure::wrap(Box::new(|| {
        RUNTIME.with(|runtime| {
            runtime
                .borrow()
                .as_ref()
                .map_or_else(String::new, GameRuntime::render_state)
        })
    }) as Box<dyn FnMut() -> String>);
    Reflect::set(
        window.as_ref(),
        &JsValue::from_str("render_game_to_text"),
        render.as_ref(),
    )?;
    RENDER_HOOK.with(|slot| *slot.borrow_mut() = Some(render));

    let advance = Closure::wrap(Box::new(|milliseconds: f64| {
        if !milliseconds.is_finite() || milliseconds <= 0.0 {
            return;
        }
        let mut remaining = (milliseconds.min(60_000.0) / 1_000.0) as f32;
        with_runtime(|game| {
            while remaining > 0.0 {
                let delta = remaining.min(1.0 / 60.0);
                game.step(delta);
                remaining -= delta;
            }
            game.resize();
            game.render();
        });
    }) as Box<dyn FnMut(f64)>);
    Reflect::set(
        window.as_ref(),
        &JsValue::from_str("advanceTime"),
        advance.as_ref(),
    )?;
    ADVANCE_HOOK.with(|slot| *slot.borrow_mut() = Some(advance));

    Ok(())
}

fn remove_listeners() {
    LISTENERS.with(|listeners| {
        for listener in listeners.borrow_mut().drain(..) {
            let _ = listener.target.remove_event_listener_with_callback(
                listener.name,
                listener.callback.as_ref().unchecked_ref(),
            );
        }
    });
}

fn remove_state_hooks(window: Option<&Window>) {
    if let Some(window) = window {
        for name in ["render_game_to_text", "advanceTime"] {
            let _ = Reflect::delete_property(window.as_ref(), &JsValue::from_str(name));
        }
    }
    RENDER_HOOK.with(|slot| {
        slot.borrow_mut().take();
    });
    ADVANCE_HOOK.with(|slot| {
        slot.borrow_mut().take();
    });
}

fn dispose_runtime() {
    let runtime = RUNTIME.with(|slot| slot.borrow_mut().take());
    if let Some(runtime) = runtime {
        if let Some(id) = runtime.raf_id {
            let _ = runtime.window.cancel_animation_frame(id);
        }
        remove_listeners();
        remove_state_hooks(Some(&runtime.window));
    } else {
        remove_listeners();
        remove_state_hooks(web_sys::window().as_ref());
    }
}

fn ensure_raf_callback() {
    RAF_CALLBACK.with(|slot| {
        if slot.borrow().is_none() {
            let callback = Closure::wrap(Box::new(on_frame) as Box<dyn FnMut(f64)>);
            *slot.borrow_mut() = Some(callback);
        }
    });
}

fn schedule_frame() -> Result<(), JsValue> {
    ensure_raf_callback();
    let id = RAF_CALLBACK.with(|slot| {
        let callback = slot.borrow();
        let callback = callback
            .as_ref()
            .ok_or_else(|| JsValue::from_str("The animation loop could not start."))?;
        let window = web_sys::window()
            .ok_or_else(|| JsValue::from_str("The browser window is unavailable."))?;
        window.request_animation_frame(callback.as_ref().unchecked_ref())
    })?;
    RUNTIME.with(|slot| {
        if let Some(runtime) = slot.borrow_mut().as_mut() {
            runtime.raf_id = Some(id);
        }
    });
    Ok(())
}

fn on_frame(timestamp: f64) {
    let should_continue = RUNTIME.with(|slot| {
        let mut runtime = slot.borrow_mut();
        let Some(game) = runtime.as_mut() else {
            return false;
        };
        if !game.root.is_connected() {
            return false;
        }
        game.raf_id = None;
        let delta = game
            .last_frame
            .map_or(0.0, |previous| {
                ((timestamp - previous).max(0.0) / 1_000.0) as f32
            })
            .min(0.05);
        game.last_frame = Some(timestamp);
        game.step(delta);
        game.resize();
        game.update_position_attributes();
        game.render();
        true
    });
    if should_continue {
        if schedule_frame().is_err() {
            dispose_runtime();
        }
    } else {
        dispose_runtime();
    }
}

fn with_runtime(mut action: impl FnMut(&mut GameRuntime)) {
    RUNTIME.with(|slot| {
        if let Some(runtime) = slot.borrow_mut().as_mut() {
            action(runtime);
        }
    });
}

fn round(value: f32) -> f32 {
    (value * 100.0).round() / 100.0
}
