use serde::Deserialize;
use std::{sync::Arc, time::Duration};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct Project {
    pub name: String,
    pub description: String,
    pub language: String,
    pub url: String,
}

#[derive(Clone)]
pub struct Portfolio {
    pub projects: Vec<Project>,
    pub live: bool,
}

#[derive(Deserialize)]
struct Repo {
    name: String,
    description: Option<String>,
    language: Option<String>,
    html_url: String,
    fork: bool,
    private: bool,
    archived: bool,
}

pub struct PortfolioCache {
    data: RwLock<Portfolio>,
}

impl PortfolioCache {
    pub fn new() -> Self {
        Self {
            data: RwLock::new(Portfolio {
                live: false,
                projects: vec![
                    Project {
                        name: "myport".into(),
                        description:
                            "Rust case study and optional WebAssembly playground.".into(),
                        language: "Rust".into(),
                        url: "https://github.com/ohakidev/myport".into(),
                    },
                    Project {
                        name: "stdactivitycheckV2".into(),
                        description: "Student activity registration and attendance workflow."
                            .into(),
                        language: "TypeScript".into(),
                        url: "https://github.com/ohakidev/stdactivitycheckV2".into(),
                    },
                ],
            }),
        }
    }

    pub async fn snapshot(&self) -> Portfolio {
        self.data.read().await.clone()
    }

    pub fn start_refresh(self: &Arc<Self>) {
        let cache = Arc::clone(self);
        tokio::spawn(async move {
            let Ok(client) = reqwest::Client::builder()
                .user_agent("ohakidev-portfolio")
                .timeout(Duration::from_secs(4))
                .https_only(true)
                .build()
            else {
                return;
            };
            let mut interval = tokio::time::interval(Duration::from_secs(3600));
            loop {
                interval.tick().await;
                let response = client
                    .get("https://api.github.com/users/ohakidev/repos?per_page=100&sort=updated")
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .send()
                    .await;
                let Ok(response) = response.and_then(reqwest::Response::error_for_status) else {
                    continue;
                };
                // GitHub is background-only: a failed refresh keeps the last readable snapshot.
                let Ok(payload) = response.json::<Vec<Repo>>().await else {
                    continue;
                };
                let projects = normalize(payload);
                if !projects.is_empty() {
                    *cache.data.write().await = Portfolio {
                        projects,
                        live: true,
                    };
                }
            }
        });
    }
}

fn clean(value: &str, limit: usize) -> String {
    value
        .chars()
        .map(|c| if c.is_whitespace() { ' ' } else { c })
        .filter(|c| !c.is_control())
        .take(limit)
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn normalize(repos: Vec<Repo>) -> Vec<Project> {
    repos
        .into_iter()
        .filter(|repo| !repo.fork && !repo.private && !repo.archived && repo.name != "ohakidev")
        .filter(|repo| {
            repo.name.len() <= 100
                && !repo.name.is_empty()
                && repo
                    .name
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
        })
        .filter(|repo| repo.html_url == format!("https://github.com/ohakidev/{}", repo.name))
        .take(8)
        .map(|repo| {
            let current_myport = repo.name == "myport";
            Project {
                name: repo.name,
                description: if current_myport {
                    "Rust case study and optional WebAssembly playground.".into()
                } else {
                    clean(
                        repo.description
                            .as_deref()
                            .unwrap_or("Public repository. Open the source for details."),
                        240,
                    )
                },
                language: if current_myport {
                    "Rust".into()
                } else {
                    clean(repo.language.as_deref().unwrap_or("Source"), 40)
                },
                url: repo.html_url,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn repo(name: &str) -> Repo {
        Repo {
            name: name.into(),
            description: Some("  public\nwork  ".into()),
            language: Some("Rust".into()),
            html_url: format!("https://github.com/ohakidev/{name}"),
            fork: false,
            private: false,
            archived: false,
        }
    }

    #[test]
    fn portfolio_cache_accepts_only_matching_public_repository_urls() {
        let mut malformed = repo("myport");
        malformed.html_url = "https://example.com/elsewhere".into();
        let mut private = repo("secret");
        private.private = true;

        let projects = normalize(vec![
            repo("myport"),
            malformed,
            private,
            repo("unsafe/name"),
        ]);

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].url, "https://github.com/ohakidev/myport");
        assert_eq!(
            projects[0].description,
            "Rust case study and optional WebAssembly playground."
        );
        assert_eq!(projects[0].language, "Rust");
    }

    #[test]
    fn portfolio_cache_limits_external_text_and_keeps_a_nonempty_fallback() {
        let mut project = repo("public-project");
        project.description = Some(format!("{}tail", "x".repeat(300)));
        assert_eq!(normalize(vec![project])[0].description.chars().count(), 240);
        assert!(normalize(vec![repo(" ")]).is_empty());
    }
}
