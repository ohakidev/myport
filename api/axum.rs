use tower::ServiceBuilder;
use vercel_runtime::{Error, axum::VercelLayer};

#[path = "../crates/server/src/main.rs"]
mod site;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let app = ServiceBuilder::new()
        .layer(VercelLayer::new())
        .service(site::vercel_app());
    vercel_runtime::run(app).await
}
