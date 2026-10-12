mod portfolio;

use askama::Template;
use axum::{
    Router,
    extract::State,
    http::{HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::get,
};
use portfolio::{Portfolio, PortfolioCache};
use std::{net::SocketAddr, path::PathBuf, sync::Arc};
use tower_http::{
    compression::CompressionLayer, services::ServeDir, set_header::SetResponseHeaderLayer,
};

#[derive(Template)]
#[template(path = "home.html")]
struct Home {
    current: &'static str,
    title: &'static str,
    description: &'static str,
    portfolio: Portfolio,
}

#[derive(Template)]
#[template(path = "work.html")]
struct Work {
    current: &'static str,
    title: &'static str,
    description: &'static str,
}

#[derive(Template)]
#[template(path = "play.html")]
struct Play {
    current: &'static str,
    title: &'static str,
    description: &'static str,
}

#[derive(Template)]
#[template(path = "not-found.html")]
struct NotFound {
    current: &'static str,
    title: &'static str,
    description: &'static str,
}

fn render(template: impl Template) -> Response {
    match template.render() {
        Ok(html) => Html(html).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Unable to display this page. Please return home or try again.",
        )
            .into_response(),
    }
}

async fn home(State(cache): State<Arc<PortfolioCache>>) -> Response {
    render(Home {
        current: "home",
        title: "Ohaki | Web development & systems",
        description: "Ohaki builds web projects from curiosity, including a source-backed Rust portfolio and a walkable garden playground.",
        portfolio: cache.snapshot().await,
    })
}

async fn work() -> Response {
    render(Work {
        current: "work",
        title: "Work | Ohaki",
        description: "Two engineering case studies: architecture, decisions, and inspectable source.",
    })
}

async fn play() -> Response {
    render(Play {
        current: "play",
        title: "Playground | Ohaki",
        description: "An optional interactive garden written in Rust and WebAssembly.",
    })
}

async fn not_found() -> Response {
    let mut response = render(NotFound {
        current: "",
        title: "Page not found | Ohaki",
        description: "Return to the portfolio or read the case studies.",
    });
    *response.status_mut() = StatusCode::NOT_FOUND;
    response
}

pub fn vercel_app() -> Router {
    app_with_assets(None)
}

fn app_with_assets(assets: Option<PathBuf>) -> Router {
    let cache = Arc::new(PortfolioCache::new());
    cache.start_refresh();
    let app = Router::new()
        .route("/", get(home))
        .route("/work", get(work))
        .route("/play", get(play))
        .route("/healthz", get(|| async { "ok" }))
        .route(
            "/robots.txt",
            get(|| async {
                (
                    [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
                    "User-agent: *\nAllow: /\n",
                )
            }),
        )
        .with_state(cache);
    let app = if let Some(assets) = assets {
        let assets = Router::new()
            .nest_service("/assets", ServeDir::new(assets))
            .layer(SetResponseHeaderLayer::if_not_present(
                header::CACHE_CONTROL,
                HeaderValue::from_static("public, max-age=3600"),
            ));
        app.merge(assets)
    } else {
        app
    };
    app.fallback(not_found)
        .layer(middleware::from_fn(secure_response))
        .layer(CompressionLayer::new())
}

async fn secure_response(request: axum::extract::Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_SECURITY_POLICY, HeaderValue::from_static("default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"));
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "permissions-policy",
        HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
    );
    if !headers.contains_key(header::CACHE_CONTROL) {
        headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-cache"));
    }
    response
}

#[allow(dead_code)] // The Vercel entrypoint runs the shared router directly.
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address: SocketAddr = std::env::var("MYPORT_BIND")
        .unwrap_or_else(|_| "127.0.0.1:3100".into())
        .parse()?;
    let assets = std::env::var_os("MYPORT_ASSETS")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../public"));
    if !assets.join("site.css").is_file() || !assets.join("play/myport_play_bg.wasm").is_file() {
        return Err(
            "Missing runtime assets. Run scripts/build.ps1 before starting the server.".into(),
        );
    }
    let app = app_with_assets(Some(assets));
    let listener = tokio::net::TcpListener::bind(address).await?;
    println!("Myport Rust server: http://{address}");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
