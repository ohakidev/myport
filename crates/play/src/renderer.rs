use wasm_bindgen::{JsCast, JsValue};
use web_sys::{
    HtmlCanvasElement, WebGl2RenderingContext as Gl, WebGlBuffer, WebGlProgram, WebGlShader,
    WebGlVertexArrayObject,
};

use crate::model::{GameMode, GameModel, station_position};

const VERTEX_SHADER: &str = r#"#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}"#;

const FRAGMENT_SHADER: &str = r#"#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 out_color;
void main() {
    out_color = vec4(v_color, 1.0);
}"#;

#[derive(Clone, Copy)]
struct Point {
    x: f32,
    z: f32,
}

pub struct Renderer {
    gl: Gl,
    program: WebGlProgram,
    buffer: WebGlBuffer,
    vao: WebGlVertexArrayObject,
    project_count: usize,
    width: u32,
    height: u32,
    center_z: f32,
    scale: f32,
}

impl Renderer {
    pub fn new(canvas: &HtmlCanvasElement, project_count: usize) -> Result<Self, JsValue> {
        let gl = canvas
            .get_context("webgl2")?
            .ok_or_else(|| JsValue::from_str("WebGL 2 is unavailable."))?
            .dyn_into::<Gl>()?;
        let program = link_program(&gl, VERTEX_SHADER, FRAGMENT_SHADER)?;
        let position_attr = gl.get_attrib_location(&program, "a_position");
        let color_attr = gl.get_attrib_location(&program, "a_color");
        if position_attr < 0 || color_attr < 0 {
            return Err(JsValue::from_str(
                "WebGL shader attributes are unavailable.",
            ));
        }
        let buffer = gl
            .create_buffer()
            .ok_or_else(|| JsValue::from_str("Could not allocate the WebGL scene buffer."))?;
        let vao = gl
            .create_vertex_array()
            .ok_or_else(|| JsValue::from_str("Could not allocate the WebGL scene layout."))?;
        gl.bind_vertex_array(Some(&vao));
        gl.bind_buffer(Gl::ARRAY_BUFFER, Some(&buffer));
        gl.enable_vertex_attrib_array(position_attr as u32);
        gl.vertex_attrib_pointer_with_i32(position_attr as u32, 2, Gl::FLOAT, false, 20, 0);
        gl.enable_vertex_attrib_array(color_attr as u32);
        gl.vertex_attrib_pointer_with_i32(color_attr as u32, 3, Gl::FLOAT, false, 20, 8);
        gl.bind_vertex_array(None);
        Ok(Self {
            gl,
            program,
            buffer,
            vao,
            project_count,
            width: 1,
            height: 1,
            center_z: 0.0,
            scale: 0.03,
        })
    }

    pub fn resize(&mut self, canvas: &HtmlCanvasElement, pixel_ratio: f32) {
        let width = canvas.client_width().max(1) as u32;
        let height = canvas.client_height().max(1) as u32;
        self.width = width.max(1);
        self.height = height.max(1);
        let pixel_ratio = pixel_ratio.clamp(1.0, 2.0);
        let pixel_width = (self.width as f32 * pixel_ratio) as u32;
        let pixel_height = (self.height as f32 * pixel_ratio) as u32;
        if canvas.width() != pixel_width {
            canvas.set_width(pixel_width);
        }
        if canvas.height() != pixel_height {
            canvas.set_height(pixel_height);
        }
        self.gl
            .viewport(0, 0, canvas.width() as i32, canvas.height() as i32);
        let max_row = (self.project_count.saturating_sub(1)) / 3;
        let min_z = -14.0;
        let max_z = max_row as f32 * 16.0 - 9.0;
        self.center_z = (min_z + max_z) * 0.5;
        let world_span = 40.0 + max_z - min_z;
        let projected_height = world_span * 0.55 + 6.0;
        self.scale =
            (self.width as f32 / world_span).min(self.height as f32 / projected_height) * 0.84;
    }

    pub fn screen_to_world(&self, x: f32, y: f32) -> [f32; 2] {
        let left_right = x * self.width as f32 / (2.0 * self.scale);
        let front_back = -y * self.height as f32 / (1.1 * self.scale);
        [
            (left_right + front_back) * 0.5,
            self.center_z + (front_back - left_right) * 0.5,
        ]
    }

    pub fn render(&self, model: &GameModel, time: f32, jump: f32) {
        let sky = if model.evening {
            [0.36, 0.46, 0.50, 1.0]
        } else {
            [0.84, 0.91, 0.89, 1.0]
        };
        self.gl.clear_color(sky[0], sky[1], sky[2], sky[3]);
        self.gl.clear(Gl::COLOR_BUFFER_BIT);

        let mut vertices = Vec::with_capacity(9_600);
        let min_x = -20.0;
        let max_x = 20.0;
        let min_z = -14.0;
        let max_z = ((self.project_count.saturating_sub(1)) / 3) as f32 * 16.0 + 5.0;
        let floor = if model.evening {
            [0.39, 0.43, 0.42]
        } else {
            [0.82, 0.80, 0.73]
        };
        self.add_box(
            &mut vertices,
            min_x,
            max_x,
            min_z,
            max_z,
            0.0,
            0.15,
            floor,
            [0.65, 0.65, 0.60],
        );
        let path = if model.evening {
            [0.49, 0.50, 0.46]
        } else {
            [0.92, 0.86, 0.72]
        };
        self.add_box(
            &mut vertices,
            -1.5,
            1.5,
            min_z,
            max_z,
            0.16,
            0.08,
            path,
            [0.71, 0.66, 0.55],
        );
        for row in 0..=((self.project_count.saturating_sub(1)) / 3) {
            let z = row as f32 * 16.0 - 9.0;
            self.add_box(
                &mut vertices,
                min_x,
                max_x,
                z - 1.15,
                z + 1.15,
                0.16,
                0.08,
                path,
                [0.71, 0.66, 0.55],
            );
            for x in [-17.0, 17.0] {
                self.add_planter(&mut vertices, x, z, model.evening);
            }
        }
        for z in [-11.5, -6.5, 4.5, 9.5, 20.5, 25.5] {
            for x in [-8.0, 8.0] {
                self.add_tree(&mut vertices, x, z, model.evening);
            }
        }

        for (index, project) in model.projects.iter().enumerate() {
            let [x, z] = station_position(index);
            let completed = model.completed.iter().any(|name| name == &project.name);
            let active = model.active == Some(index);
            let base = if completed {
                [0.56, 0.72, 0.58]
            } else if active {
                [0.35, 0.49, 0.72]
            } else {
                [0.40, 0.48, 0.55]
            };
            self.add_box(
                &mut vertices,
                x - 3.3,
                x + 3.3,
                z - 2.6,
                z + 2.6,
                0.15,
                0.55,
                base,
                [0.29, 0.36, 0.41],
            );
            let roof = if project.mode == GameMode::Sequence {
                [0.69, 0.47, 0.38]
            } else if project.mode == GameMode::Deliver {
                [0.68, 0.55, 0.34]
            } else {
                [0.32, 0.52, 0.69]
            };
            self.add_box(
                &mut vertices,
                x - 1.45,
                x + 1.45,
                z - 1.35,
                z + 1.35,
                0.6,
                2.8,
                [0.87, 0.84, 0.76],
                [0.58, 0.57, 0.52],
            );
            self.add_box(
                &mut vertices,
                x - 1.7,
                x + 1.7,
                z - 1.55,
                z + 1.55,
                2.8,
                0.7,
                roof,
                darken(roof, 0.73),
            );
            match project.mode {
                GameMode::Collect => {
                    self.add_box(
                        &mut vertices,
                        x - 2.5,
                        x - 1.65,
                        z - 1.0,
                        z + 1.0,
                        0.65,
                        0.3,
                        [0.72, 0.65, 0.48],
                        [0.51, 0.47, 0.37],
                    );
                    for target in 0..3 {
                        self.add_box(
                            &mut vertices,
                            x - 2.45 + target as f32 * 0.31,
                            x - 2.27 + target as f32 * 0.31,
                            z - 0.22,
                            z + 0.22,
                            0.96,
                            0.14,
                            [0.91, 0.72, 0.42],
                            [0.62, 0.50, 0.34],
                        );
                    }
                }
                GameMode::Sequence => {
                    self.add_box(
                        &mut vertices,
                        x - 0.72,
                        x + 0.72,
                        z - 0.72,
                        z + 0.72,
                        3.5,
                        1.0,
                        [0.82, 0.69, 0.52],
                        [0.59, 0.48, 0.39],
                    );
                    self.add_box(
                        &mut vertices,
                        x - 0.88,
                        x + 0.88,
                        z - 0.88,
                        z + 0.88,
                        4.5,
                        0.34,
                        roof,
                        darken(roof, 0.73),
                    );
                    self.add_box(
                        &mut vertices,
                        x - 0.18,
                        x + 0.18,
                        z - 0.18,
                        z + 0.18,
                        4.84,
                        0.8,
                        [0.9, 0.79, 0.58],
                        [0.62, 0.53, 0.42],
                    );
                }
                GameMode::Deliver => {
                    self.add_box(
                        &mut vertices,
                        x - 1.1,
                        x + 1.1,
                        z + 1.45,
                        z + 1.78,
                        0.6,
                        1.65,
                        [0.52, 0.4, 0.3],
                        [0.36, 0.28, 0.23],
                    );
                    for shelf in 0..3 {
                        let y = 0.92 + shelf as f32 * 0.42;
                        self.add_box(
                            &mut vertices,
                            x - 1.18,
                            x + 1.18,
                            z + 1.4,
                            z + 1.83,
                            y,
                            0.12,
                            [0.81, 0.67, 0.48],
                            [0.54, 0.43, 0.33],
                        );
                    }
                }
            }
            if completed {
                self.add_box(
                    &mut vertices,
                    x - 0.35,
                    x + 0.35,
                    z - 0.35,
                    z + 0.35,
                    3.5,
                    1.05,
                    [0.86, 0.72, 0.43],
                    [0.65, 0.52, 0.31],
                );
            }
        }

        if let Some(index) = model.active {
            let [x, z] = station_position(index);
            for target in 0..3_u8 {
                let target_x = x + (f32::from(target) - 1.0) * 3.0;
                let expected = model.next_target() == target;
                let collected = model.collected.contains(&target);
                let pulse = if model.full_effects && expected {
                    1.0 + time.sin() * 0.08
                } else {
                    1.0
                };
                let color = if collected {
                    [0.42, 0.67, 0.53]
                } else if expected {
                    [0.91, 0.67, 0.34]
                } else {
                    [0.46, 0.57, 0.64]
                };
                self.add_box(
                    &mut vertices,
                    target_x - pulse,
                    target_x + pulse,
                    z + 3.1 - pulse,
                    z + 3.1 + pulse,
                    0.2,
                    0.24,
                    color,
                    darken(color, 0.7),
                );
            }
            if model.carrying {
                let display_x = x + 3.0;
                self.add_box(
                    &mut vertices,
                    display_x - 0.8,
                    display_x + 0.8,
                    z + 2.0,
                    z + 3.0,
                    0.3,
                    1.8,
                    [0.57, 0.45, 0.33],
                    [0.40, 0.32, 0.24],
                );
            }
        }

        let [x, z] = model.player;
        let bounce = if model.full_effects {
            jump.max(0.0) * 1.5
        } else {
            0.0
        };
        let body = if model.carrying {
            [0.72, 0.39, 0.31]
        } else {
            [0.23, 0.35, 0.53]
        };
        self.add_box(
            &mut vertices,
            x - 0.75,
            x + 0.75,
            z - 0.65,
            z + 0.65,
            0.25 + bounce,
            1.55,
            body,
            darken(body, 0.68),
        );
        self.add_box(
            &mut vertices,
            x - 0.55,
            x + 0.55,
            z - 0.5,
            z + 0.5,
            1.8 + bounce,
            0.76,
            [0.88, 0.69, 0.52],
            [0.68, 0.51, 0.40],
        );

        self.gl.use_program(Some(&self.program));
        self.gl.bind_vertex_array(Some(&self.vao));
        self.gl.bind_buffer(Gl::ARRAY_BUFFER, Some(&self.buffer));
        let data = js_sys::Float32Array::from(vertices.as_slice());
        self.gl
            .buffer_data_with_array_buffer_view(Gl::ARRAY_BUFFER, &data, Gl::DYNAMIC_DRAW);
        self.gl
            .draw_arrays(Gl::TRIANGLES, 0, (vertices.len() / 5) as i32);
        self.gl.bind_vertex_array(None);
    }

    fn add_box(
        &self,
        out: &mut Vec<f32>,
        min_x: f32,
        max_x: f32,
        min_z: f32,
        max_z: f32,
        y: f32,
        height: f32,
        top: [f32; 3],
        side: [f32; 3],
    ) {
        let base = [
            Point { x: min_x, z: min_z },
            Point { x: max_x, z: min_z },
            Point { x: max_x, z: max_z },
            Point { x: min_x, z: max_z },
        ];
        let raised = base.map(|point| self.project(point.x, point.z, y + height));
        let ground = base.map(|point| self.project(point.x, point.z, y));
        self.quad(out, raised, top);
        for index in 0..4 {
            let next = (index + 1) % 4;
            self.quad(
                out,
                [raised[index], raised[next], ground[next], ground[index]],
                side,
            );
        }
    }

    fn add_planter(&self, out: &mut Vec<f32>, x: f32, z: f32, evening: bool) {
        let soil = if evening {
            [0.30, 0.32, 0.29]
        } else {
            [0.52, 0.42, 0.32]
        };
        let leaves = if evening {
            [0.32, 0.49, 0.42]
        } else {
            [0.33, 0.56, 0.39]
        };
        self.add_box(
            out,
            x - 1.3,
            x + 1.3,
            z - 1.3,
            z + 1.3,
            0.16,
            0.24,
            soil,
            [0.42, 0.35, 0.28],
        );
        self.add_box(
            out,
            x - 1.1,
            x + 1.1,
            z - 1.1,
            z + 1.1,
            0.42,
            0.42,
            leaves,
            darken(leaves, 0.74),
        );
        self.add_box(
            out,
            x - 0.55,
            x + 0.55,
            z - 0.55,
            z + 0.55,
            0.85,
            0.34,
            darken(leaves, 1.14),
            darken(leaves, 0.82),
        );
    }

    fn add_tree(&self, out: &mut Vec<f32>, x: f32, z: f32, evening: bool) {
        let trunk = [0.40, 0.31, 0.25];
        let leaves = if evening {
            [0.28, 0.45, 0.39]
        } else {
            [0.37, 0.57, 0.40]
        };
        self.add_box(
            out,
            x - 0.18,
            x + 0.18,
            z - 0.18,
            z + 0.18,
            0.16,
            1.55,
            trunk,
            darken(trunk, 0.78),
        );
        self.add_box(
            out,
            x - 1.0,
            x + 1.0,
            z - 0.9,
            z + 0.9,
            1.2,
            1.1,
            leaves,
            darken(leaves, 0.75),
        );
        self.add_box(
            out,
            x - 0.78,
            x + 0.78,
            z - 0.72,
            z + 0.72,
            2.2,
            1.0,
            darken(leaves, 1.06),
            darken(leaves, 0.82),
        );
        self.add_box(
            out,
            x - 0.46,
            x + 0.46,
            z - 0.44,
            z + 0.44,
            3.1,
            0.62,
            darken(leaves, 1.16),
            darken(leaves, 0.9),
        );
    }

    fn quad(&self, out: &mut Vec<f32>, points: [[f32; 2]; 4], color: [f32; 3]) {
        for index in [0_usize, 1, 2, 0, 2, 3] {
            out.extend_from_slice(&[
                points[index][0],
                points[index][1],
                color[0],
                color[1],
                color[2],
            ]);
        }
    }

    fn project(&self, x: f32, z: f32, height: f32) -> [f32; 2] {
        [
            (x - (z - self.center_z)) * self.scale * 2.0 / self.width as f32,
            -(x + z - self.center_z) * self.scale * 1.1 / self.height as f32
                + height * self.scale * 2.2 / self.height as f32,
        ]
    }
}

impl Drop for Renderer {
    fn drop(&mut self) {
        self.gl.delete_vertex_array(Some(&self.vao));
        self.gl.delete_buffer(Some(&self.buffer));
        self.gl.delete_program(Some(&self.program));
    }
}

fn darken(color: [f32; 3], factor: f32) -> [f32; 3] {
    [color[0] * factor, color[1] * factor, color[2] * factor]
}

fn compile_shader(gl: &Gl, kind: u32, source: &str) -> Result<WebGlShader, JsValue> {
    let shader = gl
        .create_shader(kind)
        .ok_or_else(|| JsValue::from_str("Could not create a WebGL shader."))?;
    gl.shader_source(&shader, source);
    gl.compile_shader(&shader);
    if gl
        .get_shader_parameter(&shader, Gl::COMPILE_STATUS)
        .as_bool()
        == Some(true)
    {
        return Ok(shader);
    }
    Err(JsValue::from_str(
        &gl.get_shader_info_log(&shader)
            .unwrap_or_else(|| "WebGL shader compilation failed.".into()),
    ))
}

fn link_program(
    gl: &Gl,
    vertex_source: &str,
    fragment_source: &str,
) -> Result<WebGlProgram, JsValue> {
    let vertex = compile_shader(gl, Gl::VERTEX_SHADER, vertex_source)?;
    let fragment = compile_shader(gl, Gl::FRAGMENT_SHADER, fragment_source)?;
    let program = gl
        .create_program()
        .ok_or_else(|| JsValue::from_str("Could not create a WebGL program."))?;
    gl.attach_shader(&program, &vertex);
    gl.attach_shader(&program, &fragment);
    gl.link_program(&program);
    gl.delete_shader(Some(&vertex));
    gl.delete_shader(Some(&fragment));
    if gl
        .get_program_parameter(&program, Gl::LINK_STATUS)
        .as_bool()
        == Some(true)
    {
        return Ok(program);
    }
    Err(JsValue::from_str(
        &gl.get_program_info_log(&program)
            .unwrap_or_else(|| "WebGL program linking failed.".into()),
    ))
}
