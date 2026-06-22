// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::net::TcpListener;
use std::io::{Read, Write};
use std::thread;
use tauri::Emitter;

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct ClientLog {
    #[serde(rename = "type")]
    log_type: String, // THOUGHT or ACTION or SYSTEM
    message: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn handle_connection(mut stream: std::net::TcpStream, app_handle: tauri::AppHandle) {
    let mut buffer = [0; 4096];
    let mut bytes_read = 0;
    while bytes_read < buffer.len() {
        match stream.read(&mut buffer[bytes_read..]) {
            Ok(0) => break,
            Ok(n) => {
                bytes_read += n;
                // Since local script HTTP POSTs are small, they fit in one read.
                if bytes_read > 0 {
                    break;
                }
            }
            Err(_) => break,
        }
    }

    let req_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    
    // Support pre-flight CORS requests
    if req_str.starts_with("OPTIONS") {
        let response = "HTTP/1.1 204 No Content\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n\
                        Access-Control-Allow-Headers: Content-Type\r\n\
                        Connection: close\r\n\r\n";
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        return;
    }

    if req_str.starts_with("POST /client/log") {
        // Parse the body
        if let Some(body_start) = req_str.find("\r\n\r\n") {
            let body = &req_str[body_start + 4..];
            if let Some(json_start) = body.find('{') {
                if let Some(json_end) = body.rfind('}') {
                    let json_str = &body[json_start..=json_end];
                    if let Ok(log) = serde_json::from_str::<ClientLog>(json_str) {
                        // Emit event globally to our React app
                        let _ = app_handle.emit("client-log", log);
                    }
                }
            }
        }
        
        let response_body = r#"{"status":"ok"}"#;
        let response = format!("HTTP/1.1 200 OK\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n\
                        Access-Control-Allow-Headers: Content-Type\r\n\
                        Content-Type: application/json\r\n\
                        Content-Length: {}\r\n\
                        Connection: close\r\n\r\n{}", response_body.len(), response_body);
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        return;
    }

    // Default 404
    let response = "HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n";
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            thread::spawn(move || {
                // Bind to local address 127.0.0.1 on port 9090
                match TcpListener::bind("127.0.0.1:9090") {
                    Ok(listener) => {
                        for stream in listener.incoming() {
                            match stream {
                                Ok(stream) => {
                                    let app_clone = app_handle.clone();
                                    thread::spawn(move || {
                                        handle_connection(stream, app_clone);
                                    });
                                }
                                Err(_) => {}
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to bind to port 9090: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
