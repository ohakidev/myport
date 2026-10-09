use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const SESSION_VERSION: u8 = 2;
pub const SESSION_KEY: &str = "ohaki-garden-session-v2";
pub const LEGACY_KEY: &str = "ohaki-garden-stories-v1";
pub const PREFERENCES_KEY: &str = "ohaki-garden-preferences-v1";
pub const TARGET_COUNT: u8 = 3;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameAction {
    Up,
    Down,
    Left,
    Right,
    Start,
    Begin,
    Next,
    Target(u8),
    Visit(usize),
    Workshop(usize),
    Resume,
    Cancel,
    Discard,
    Light,
    MotionToggle,
    MotionFull,
    MotionSystem,
}

impl GameAction {
    pub fn parse(value: &str) -> Option<Self> {
        Some(match value {
            "up" | "move-up" => Self::Up,
            "down" | "move-down" => Self::Down,
            "left" | "move-left" => Self::Left,
            "right" | "move-right" => Self::Right,
            "start" => Self::Start,
            "begin" => Self::Begin,
            "next" => Self::Next,
            "resume" => Self::Resume,
            "cancel" => Self::Cancel,
            "discard" => Self::Discard,
            "light" => Self::Light,
            "motion" => Self::MotionToggle,
            "motion-full" => Self::MotionFull,
            "motion-system" => Self::MotionSystem,
            visit if visit.starts_with("visit:") || visit.starts_with("visit-") => {
                let delimiter = if visit.starts_with("visit:") {
                    ':'
                } else {
                    '-'
                };
                let index = visit.rsplit_once(delimiter)?.1.parse::<usize>().ok()?;
                Self::Visit(index)
            }
            workshop if workshop.starts_with("workshop-") => {
                let index = workshop.rsplit_once('-')?.1.parse::<usize>().ok()?;
                Self::Workshop(index)
            }
            target => {
                let target = target
                    .strip_prefix("target-")
                    .or_else(|| target.strip_prefix("target:"))?
                    .parse::<u8>()
                    .ok()?;
                if target >= TARGET_COUNT {
                    return None;
                }
                Self::Target(target)
            }
        })
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(default)]
#[serde(rename_all = "camelCase")]
pub struct GardenPreferences {
    pub evening: bool,
    pub full_effects: Option<bool>,
}

impl Default for GardenPreferences {
    fn default() -> Self {
        Self {
            evening: false,
            full_effects: None,
        }
    }
}

impl GardenPreferences {
    pub fn parse(raw: Option<&str>) -> Self {
        raw.and_then(|value| serde_json::from_str(value).ok())
            .unwrap_or_default()
    }

    pub fn serialize(&self) -> String {
        serde_json::to_string(self)
            .unwrap_or_else(|_| "{\"evening\":false,\"fullEffects\":null}".into())
    }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GameMode {
    Collect,
    Sequence,
    Deliver,
}

impl GameMode {
    pub fn label(self) -> &'static str {
        match self {
            Self::Collect => "collect",
            Self::Sequence => "sequence",
            Self::Deliver => "deliver",
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub struct ProjectRef {
    pub name: String,
    pub mode: GameMode,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSave {
    pub project: String,
    pub mode: GameMode,
    pub progress: u8,
    pub carrying: bool,
    pub collected: Vec<u8>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
pub struct GardenSave {
    pub version: u8,
    pub completed: Vec<String>,
    pub active: Option<ActiveSave>,
}

impl Default for GardenSave {
    fn default() -> Self {
        Self {
            version: SESSION_VERSION,
            completed: Vec::new(),
            active: None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct GameModel {
    pub projects: Vec<ProjectRef>,
    pub player: [f32; 2],
    pub started: bool,
    pub nearby: Option<usize>,
    pub active: Option<usize>,
    pub progress: u8,
    pub carrying: bool,
    pub collected: Vec<u8>,
    pub completed: Vec<String>,
    pub completed_project: Option<usize>,
    pub message: String,
    pub resumable: Option<ActiveSave>,
    pub storage_available: bool,
    pub full_effects: bool,
    pub evening: bool,
    pub explicit_motion_choice: bool,
}

impl GameModel {
    pub fn new(
        projects: Vec<ProjectRef>,
        save: GardenSave,
        storage_available: bool,
        prefers_reduced_motion: bool,
        full_effects: Option<bool>,
        evening: bool,
    ) -> Self {
        let projects = if projects.is_empty() {
            vec![ProjectRef {
                name: "myport".into(),
                mode: GameMode::Deliver,
            }]
        } else {
            projects
        };
        let mut model = Self {
            projects,
            player: [-13.0, -4.5],
            started: true,
            nearby: None,
            active: None,
            progress: 0,
            carrying: false,
            collected: Vec::new(),
            completed: save.completed,
            completed_project: None,
            message: "Move with WASD or arrows. Reach a workshop and press E to begin its story."
                .into(),
            resumable: save.active,
            storage_available,
            full_effects: full_effects.unwrap_or(!prefers_reduced_motion),
            evening,
            explicit_motion_choice: full_effects.is_some(),
        };
        if let Some(active) = &model.resumable {
            model.message = if model.project_index(&active.project).is_some() {
                format!(
                    "A story is paused at {}/3. Resume it when you are ready.",
                    active.progress
                )
            } else {
                format!(
                    "A saved story from {} is not in this project list. Your progress is safe; discard it only if you choose.",
                    active.project
                )
            };
        }
        model.refresh_nearby();
        model
    }

    pub fn mode(&self) -> Option<GameMode> {
        self.active.map(|index| self.projects[index].mode)
    }

    pub fn active_name(&self) -> Option<&str> {
        self.active.map(|index| self.projects[index].name.as_str())
    }

    pub fn chapter_progress(&self) -> Option<u8> {
        if self.completed_project.is_some() {
            Some(TARGET_COUNT)
        } else if self.active.is_some() {
            Some(self.progress)
        } else {
            self.resumable.as_ref().map(|save| save.progress)
        }
    }

    pub fn active_save(&self) -> Option<ActiveSave> {
        self.active.map(|index| ActiveSave {
            project: self.projects[index].name.clone(),
            mode: self.projects[index].mode,
            progress: self.progress,
            carrying: self.carrying,
            collected: self.collected.clone(),
        })
    }

    pub fn save(&self) -> GardenSave {
        let mut completed = self.completed.clone();
        deduplicate_names(&mut completed);
        GardenSave {
            version: SESSION_VERSION,
            completed,
            active: self.active_save().or_else(|| self.resumable.clone()),
        }
    }

    pub fn move_player(&mut self, dx: f32, dz: f32, elapsed_seconds: f32) {
        if !self.started || (dx == 0.0 && dz == 0.0) {
            return;
        }
        let step = elapsed_seconds.clamp(0.0, 0.05) * 10.0;
        self.player[0] = (self.player[0] + dx * step).clamp(-19.0, 19.0);
        self.player[1] = (self.player[1] + dz * step).clamp(-15.0, 60.0);
        let previous = self.nearby;
        self.refresh_nearby();
        if self.active.is_none() && self.resumable.is_none() && previous != self.nearby {
            self.message = self.nearby.map_or_else(
                || "Keep exploring. Move onto a workshop marker to begin a chapter.".into(),
                |index| {
                    format!(
                        "Near {}. Press E or choose Begin chapter.",
                        self.projects[index].name
                    )
                },
            );
        }
    }

    pub fn move_to(&mut self, x: f32, z: f32) {
        if !self.started || self.active.is_some() {
            return;
        }
        self.player = [x.clamp(-19.0, 19.0), z.clamp(-15.0, 60.0)];
        self.refresh_nearby();
        self.message = self.nearby.map_or_else(
            || "Keep exploring. Move onto a workshop marker to begin a chapter.".into(),
            |index| {
                format!(
                    "At {}. Press E or choose Begin chapter.",
                    self.projects[index].name
                )
            },
        );
    }

    pub fn begin(&mut self) {
        if self.resumable.is_some() {
            self.message = "Resume or discard the saved chapter before starting another.".into();
            return;
        }
        let Some(index) = self.nearby else {
            self.message = "Move to a project marker before beginning a chapter.".into();
            return;
        };
        self.begin_project(index);
    }

    pub fn begin_project(&mut self, index: usize) {
        if self.resumable.is_some() {
            self.message = "Resume or discard the saved chapter before starting another.".into();
            return;
        }
        if self.active.is_some() {
            self.message = "Finish or leave the current chapter before starting another.".into();
            return;
        }
        if index >= self.projects.len() {
            self.message = "That workshop is unavailable.".into();
            return;
        }
        self.nearby = Some(index);
        self.active = Some(index);
        self.progress = 0;
        self.carrying = false;
        self.collected.clear();
        self.completed_project = None;
        self.message = format!(
            "Chapter started: {}. Follow the highlighted markers.",
            self.projects[index].name
        );
    }

    pub fn resume(&mut self) {
        let Some(saved) = self.resumable.clone() else {
            return;
        };
        let Some(index) = self.project_index(&saved.project) else {
            self.message = format!(
                "{} is unavailable. Your saved progress remains safe; choose Discard saved story to remove it.",
                saved.project
            );
            return;
        };
        self.active = Some(index);
        self.progress = saved.progress;
        self.carrying = saved.carrying;
        self.collected = saved.collected;
        self.resumable = None;
        self.message = format!("Story resumed · {}/3 complete.", self.progress);
    }

    pub fn cancel(&mut self) {
        if let Some(active) = self.active_save() {
            self.resumable = Some(active);
            self.active = None;
            self.message = "Chapter paused. Resume it whenever you return.".into();
        } else if self.resumable.is_some() {
            self.message = "Resume the saved chapter or choose Discard saved story.".into();
            return;
        }
        self.refresh_nearby();
    }

    pub fn discard_saved(&mut self) {
        self.resumable = None;
        self.message = "Saved story discarded. Your completed chapters remain.".into();
    }

    pub fn advance_after_completion(&mut self) {
        if self.completed_project.take().is_some() {
            self.message = "Chapter saved. Keep exploring when you are ready.".into();
        }
    }

    pub fn interact(&mut self) {
        if !self.started {
            self.started = true;
            self.message = "Move to a project marker and press E to begin its story.".into();
        } else if self.active.is_none() {
            self.begin();
        } else {
            let target = self.next_target();
            self.step_target(target);
        }
    }

    pub fn next_target(&self) -> u8 {
        match self.mode() {
            Some(GameMode::Deliver) => {
                if self.carrying {
                    2
                } else {
                    0
                }
            }
            Some(GameMode::Sequence) => self.progress.min(2),
            Some(GameMode::Collect) => (0..TARGET_COUNT)
                .find(|target| !self.collected.contains(target))
                .unwrap_or(2),
            None => 0,
        }
    }

    pub fn target_position(&self, target: u8) -> Option<[f32; 2]> {
        let index = self.active?;
        let [x, z] = station_position(index);
        match self.mode()? {
            GameMode::Deliver => Some([x + (if target == 0 { -3.0 } else { 3.0 }), z + 3.1]),
            _ => Some([x + (f32::from(target) - 1.0) * 3.0, z + 3.1]),
        }
    }

    pub fn step_target(&mut self, target: u8) {
        let Some(mode) = self.mode() else {
            self.message = "Choose a nearby project before using chapter markers.".into();
            return;
        };
        if target >= TARGET_COUNT {
            self.message = "That chapter marker is unavailable.".into();
            return;
        }
        match mode {
            GameMode::Collect => {
                if !self.collected.contains(&target) {
                    self.collected.push(target);
                    self.progress = self.collected.len() as u8;
                    self.message = format!(
                        "Idea collected ({}/3). Follow the highlighted mark to the next one.",
                        self.progress
                    );
                }
            }
            GameMode::Sequence => {
                if target == self.progress {
                    self.collected.push(target);
                    self.progress += 1;
                    self.message = format!(
                        "Connected ({}/3). Follow the next numbered pad.",
                        self.progress
                    );
                } else {
                    self.progress = 0;
                    self.collected.clear();
                    self.message = "Wrong pad. Sequence reset to 0/3. Start at pad 1.".into();
                }
            }
            GameMode::Deliver => {
                if !self.carrying && target == 0 {
                    self.carrying = true;
                    self.message = format!(
                        "Picked up book {} of 3. Carry it to the display.",
                        self.progress + 1
                    );
                } else if self.carrying && target == 2 {
                    self.carrying = false;
                    self.progress += 1;
                    self.message =
                        format!("Book delivered ({}/3). Return to the tray.", self.progress);
                } else {
                    self.message = if self.carrying {
                        "Deliver the book at the highlighted display."
                    } else {
                        "Pick up a book from the highlighted tray first."
                    }
                    .into();
                }
            }
        }
        self.complete_if_ready();
    }

    pub fn toggle_light(&mut self) {
        self.evening = !self.evening;
        self.message = if self.evening {
            "Evening light enabled."
        } else {
            "Daylight restored."
        }
        .into();
    }

    pub fn toggle_motion(&mut self) {
        self.full_effects = !self.full_effects;
        self.explicit_motion_choice = true;
        self.message = if self.full_effects {
            "Full effects enabled for this visit."
        } else {
            "Calm mode enabled. All controls remain available."
        }
        .into();
    }

    pub fn refresh_nearby(&mut self) {
        let mut nearest = None;
        let mut distance = 6.5_f32;
        for index in 0..self.projects.len() {
            let station = station_position(index);
            let next = (self.player[0] - station[0]).hypot(self.player[1] - station[1]);
            if self.active == Some(index) {
                continue;
            }
            if next < distance {
                nearest = Some(index);
                distance = next;
            }
        }
        self.nearby = nearest;
    }

    fn complete_if_ready(&mut self) {
        if self.progress < TARGET_COUNT {
            return;
        }
        if let Some(index) = self.active.take() {
            let name = self.projects[index].name.clone();
            if !self.completed.contains(&name) {
                self.completed.push(name.clone());
            }
            self.completed_project = Some(index);
            self.progress = 0;
            self.carrying = false;
            self.collected.clear();
            self.resumable = None;
            self.message = format!(
                "Chapter complete · {name}. Choose another project marker when you are ready."
            );
        }
    }

    fn project_index(&self, name: &str) -> Option<usize> {
        self.projects
            .iter()
            .position(|project| project.name == name)
    }
}

pub fn station_position(index: usize) -> [f32; 2] {
    [
        ((index % 3) as f32 - 1.0) * 13.0,
        (index / 3) as f32 * 16.0 - 9.0,
    ]
}

pub fn normalize_save(
    session_raw: Option<&str>,
    legacy_raw: Option<&str>,
    projects: &[ProjectRef],
) -> GardenSave {
    let legacy = legacy_raw.and_then(|raw| serde_json::from_str::<Value>(raw).ok());
    let session = session_raw.and_then(|raw| serde_json::from_str::<Value>(raw).ok());
    let mut completed = names_from(legacy.as_ref());
    if let Some(session) = session.as_ref() {
        completed.extend(
            session
                .get("completed")
                .map(names_from_value)
                .unwrap_or_default(),
        );
    }
    deduplicate_names(&mut completed);
    let active = session.as_ref().and_then(|session| {
        (session.get("version").and_then(Value::as_u64) == Some(SESSION_VERSION.into()))
            .then(|| {
                session
                    .get("active")
                    .and_then(|value| normalize_active(value, projects))
            })
            .flatten()
    });
    GardenSave {
        version: SESSION_VERSION,
        completed,
        active,
    }
}

fn names_from(value: Option<&Value>) -> Vec<String> {
    value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter(|name| !name.is_empty())
        .map(str::to_owned)
        .collect()
}

fn names_from_value(value: &Value) -> Vec<String> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter(|name| !name.is_empty())
        .map(str::to_owned)
        .collect()
}

fn deduplicate_names(names: &mut Vec<String>) {
    let mut seen = Vec::with_capacity(names.len());
    names.retain(|name| {
        if name.is_empty() || seen.contains(name) {
            false
        } else {
            seen.push(name.clone());
            true
        }
    });
}

fn normalize_active(value: &Value, projects: &[ProjectRef]) -> Option<ActiveSave> {
    let project = value.get("project")?.as_str()?.to_owned();
    if project.is_empty() {
        return None;
    }
    let mode = match value.get("mode")?.as_str()? {
        "collect" => GameMode::Collect,
        "sequence" => GameMode::Sequence,
        "deliver" => GameMode::Deliver,
        _ => return None,
    };
    if projects
        .iter()
        .find(|candidate| candidate.name == project)
        .is_some_and(|candidate| candidate.mode != mode)
    {
        return None;
    }
    let progress = u8::try_from(value.get("progress")?.as_u64()?).ok()?;
    let carrying = value.get("carrying")?.as_bool()?;
    let collected_values = value.get("collected")?.as_array()?;
    let collected = collected_values
        .iter()
        .map(|target| u8::try_from(target.as_u64()?).ok())
        .collect::<Option<Vec<_>>>()?;
    if progress >= TARGET_COUNT || collected.iter().any(|target| *target >= TARGET_COUNT) {
        return None;
    }
    let mut unique = collected.clone();
    unique.sort_unstable();
    unique.dedup();
    if unique.len() != collected.len() {
        return None;
    }
    match mode {
        GameMode::Deliver if !collected.is_empty() => return None,
        GameMode::Collect if carrying || collected.len() != progress as usize => return None,
        GameMode::Sequence
            if carrying
                || collected.len() != progress as usize
                || collected
                    .iter()
                    .enumerate()
                    .any(|(index, target)| index != *target as usize) =>
        {
            return None;
        }
        _ => {}
    }
    Some(ActiveSave {
        project,
        mode,
        progress,
        carrying,
        collected,
    })
}

pub fn serialize_save(save: &GardenSave) -> String {
    let mut normalized = save.clone();
    normalized.version = SESSION_VERSION;
    deduplicate_names(&mut normalized.completed);
    serde_json::to_string(&normalized).unwrap_or_else(|_| {
        format!("{{\"version\":{SESSION_VERSION},\"completed\":[],\"active\":null}}")
    })
}

pub fn serialize_legacy_completions(completed: &[String]) -> String {
    let mut completed = completed.to_vec();
    deduplicate_names(&mut completed);
    serde_json::to_string(&completed).unwrap_or_else(|_| "[]".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn projects() -> Vec<ProjectRef> {
        vec![ProjectRef {
            name: "studio".into(),
            mode: GameMode::Sequence,
        }]
    }

    #[test]
    fn arrival_position_starts_near_the_first_workshop() {
        let model = GameModel::new(projects(), GardenSave::default(), true, false, None, false);
        assert_eq!(model.player, [-13.0, -4.5]);
        assert_eq!(model.nearby, Some(0));
    }

    #[test]
    fn action_names_accept_only_known_moves_and_three_targets() {
        assert_eq!(GameAction::parse("move-up"), Some(GameAction::Up));
        assert_eq!(GameAction::parse("target-2"), Some(GameAction::Target(2)));
        assert_eq!(GameAction::parse("target:0"), Some(GameAction::Target(0)));
        assert_eq!(GameAction::parse("target-3"), None);
        assert_eq!(GameAction::parse("visit:2"), Some(GameAction::Visit(2)));
        assert_eq!(
            GameAction::parse("workshop-0"),
            Some(GameAction::Workshop(0))
        );
        assert_eq!(GameAction::parse("unexpected"), None);
    }

    #[test]
    fn preferences_round_trip_camel_case_and_keep_system_motion_as_default() {
        let saved = GardenPreferences::parse(Some(r#"{"evening":true,"fullEffects":false}"#));
        assert_eq!(
            saved,
            GardenPreferences {
                evening: true,
                full_effects: Some(false)
            }
        );
        assert_eq!(GardenPreferences::parse(Some(&saved.serialize())), saved);
        assert_eq!(GardenPreferences::parse(None), GardenPreferences::default());
        assert_eq!(
            GardenPreferences::parse(Some(r#"{"fullEffects":false}"#)),
            GardenPreferences {
                evening: false,
                full_effects: Some(false)
            },
        );
        assert_eq!(
            GardenPreferences::parse(Some("not json")),
            GardenPreferences::default()
        );
    }

    #[test]
    fn merges_legacy_completions_and_preserves_only_valid_v2_progress() {
        let session = json!({
            "version": 2,
            "completed": ["studio", "unknown", "studio", ""],
            "active": {"project": "studio", "mode": "sequence", "progress": 2, "carrying": false, "collected": [0, 1]}
        }).to_string();
        let legacy = json!(["old", "studio", null, "old"]).to_string();
        let saved = normalize_save(Some(&session), Some(&legacy), &projects());
        assert_eq!(saved.version, 2);
        assert_eq!(saved.completed, ["old", "studio", "unknown"]);
        assert_eq!(
            saved.active,
            Some(ActiveSave {
                project: "studio".into(),
                mode: GameMode::Sequence,
                progress: 2,
                carrying: false,
                collected: vec![0, 1],
            })
        );
        assert!(
            normalize_save(Some(&serialize_save(&saved)), None, &projects())
                .active
                .is_some()
        );
        assert_eq!(
            serialize_legacy_completions(&saved.completed),
            "[\"old\",\"studio\",\"unknown\"]"
        );
    }

    #[test]
    fn invalid_sequence_save_is_rejected_without_losing_completed_names() {
        let session = json!({
            "version": 2,
            "completed": ["studio"],
            "active": {"project": "studio", "mode": "sequence", "progress": 2, "carrying": false, "collected": [1, 0]}
        }).to_string();
        let saved = normalize_save(Some(&session), None, &projects());
        assert_eq!(saved.completed, ["studio"]);
        assert_eq!(saved.active, None);
    }

    #[test]
    fn unknown_project_resume_is_retained_and_not_treated_as_corrupt() {
        let session = json!({
            "version": 2,
            "completed": [],
            "active": {"project": "removed-project", "mode": "collect", "progress": 1, "carrying": false, "collected": [2]}
        }).to_string();
        let saved = normalize_save(Some(&session), None, &projects());
        assert_eq!(
            saved.active.as_ref().map(|active| active.project.as_str()),
            Some("removed-project")
        );
        let model = GameModel::new(projects(), saved, true, false, Some(false), false);
        assert!(model.resumable.is_some());
        assert!(model.message.contains("progress is safe"));
    }

    #[test]
    fn resume_restores_the_same_chapter_progress_and_saved_completion_history() {
        let saved = GardenSave {
            version: SESSION_VERSION,
            completed: vec!["another-project".into()],
            active: Some(ActiveSave {
                project: "studio".into(),
                mode: GameMode::Sequence,
                progress: 2,
                carrying: false,
                collected: vec![0, 1],
            }),
        };
        let mut model = GameModel::new(projects(), saved, true, false, Some(false), false);

        model.resume();

        assert_eq!(model.active, Some(0));
        assert_eq!(model.progress, 2);
        assert_eq!(model.collected, [0, 1]);
        assert_eq!(model.completed, ["another-project"]);
        assert_eq!(
            model.save().active,
            Some(ActiveSave {
                project: "studio".into(),
                mode: GameMode::Sequence,
                progress: 2,
                carrying: false,
                collected: vec![0, 1],
            })
        );
    }

    #[test]
    fn chapter_progress_tracks_active_paused_resumed_and_completed_states() {
        let mut model = GameModel::new(
            projects(),
            GardenSave::default(),
            true,
            false,
            Some(false),
            false,
        );
        assert_eq!(model.chapter_progress(), None);

        model.begin_project(0);
        assert_eq!(model.chapter_progress(), Some(0));
        model.step_target(0);
        model.cancel();
        assert_eq!(model.chapter_progress(), Some(1));

        model.resume();
        assert_eq!(model.chapter_progress(), Some(1));
        model.step_target(1);
        model.step_target(2);
        assert_eq!(model.chapter_progress(), Some(TARGET_COUNT));

        model.advance_after_completion();
        assert_eq!(model.chapter_progress(), None);
    }

    #[test]
    fn completing_and_advancing_a_sequence_keeps_completion_saved() {
        let mut model = GameModel::new(
            projects(),
            GardenSave::default(),
            true,
            false,
            Some(false),
            false,
        );
        model.begin_project(0);
        model.step_target(0);
        model.step_target(2);
        assert_eq!(model.progress, 0);
        assert!(model.collected.is_empty());
        model.step_target(0);
        model.step_target(1);
        model.step_target(2);
        assert_eq!(model.active, None);
        assert_eq!(model.completed, ["studio"]);
        assert_eq!(model.completed_project, Some(0));

        model.advance_after_completion();

        assert_eq!(model.completed_project, None);
        assert_eq!(model.save().completed, ["studio"]);
    }
}
