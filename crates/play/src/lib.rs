mod model;

pub use model::{
    ActiveSave, GameAction, GameMode, GameModel, GardenPreferences, GardenSave, LEGACY_KEY,
    PREFERENCES_KEY, ProjectRef, SESSION_KEY, SESSION_VERSION, normalize_save,
    serialize_legacy_completions, serialize_save,
};

#[cfg(target_arch = "wasm32")]
mod renderer;
#[cfg(target_arch = "wasm32")]
mod runtime;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn on_start() -> Result<(), wasm_bindgen::JsValue> {
    runtime::initialize()
}
