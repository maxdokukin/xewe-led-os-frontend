#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <map>

// --- Network Credentials ---
const char* ssid = "XeWe Labs";
const char* password = "Buildcoolshit";

WebServer server(80);

// --- Auto-Generated Web Files ---
#include "templates/schedule_html.h"
#include "static/schedule_core_js.h"
#include "static/schedule_style_css.h"
#include "static/schedule_actions_js.h"
#include "static/schedule_interactions_js.h"
#include "static/schedule_utils_js.h"
#include "static/schedule_ui_js.h"
// --------------------------------

// --- State Management ---
// Replicates Flask's SCHEDULE_DATA dictionary. Escaped JSON strings represent the inner dictionaries.
std::map<String, String> SCHEDULE_DATA = {
    {"1", "{\"id\":\"1\",\"commands\":[\"\\\"$led_set_rgb 255 0 0\\\" \\\"$led turn_off\\\"\"],\"color\":\"#33FF33\",\"day\":0,\"start_time\":540,\"end_time\":600}"},
    {"2", "{\"id\":\"2\",\"commands\":[\"\\\"$led_set_rgb 0 255 0\\\" \\\"$led turn_on\\\"\"],\"color\":\"#33FF33\",\"day\":1,\"start_time\":600,\"end_time\":660}"}
};

// --- CORS Helper ---
// Must be called right before EVERY server.send() to satisfy browser security policies
void applyCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void setupRoutes() {
  
  // ==========================================
  // 1. FRONTEND TEMPLATE & STATIC FILE ROUTES
  // ==========================================

  // Map the main template to both the file path and the Flask root path
  server.on("/schedule", HTTP_GET, []() {
    Serial.println("[GET] /schedule (Home Template hit)");
    applyCORS();
    server.send_P(200, "text/html", SCHEDULE_HTML);
  });
  
  server.on("/templates/schedule.html", HTTP_GET, []() {
    Serial.println("[GET] /templates/schedule.html");
    applyCORS();
    server.send_P(200, "text/html", SCHEDULE_HTML);
  });

  // Jinja fallback catch: If the browser requests the raw Jinja tag
  server.on("/%7B%7B%20url_for('static',%20filename='style.css')%20%7D%7D", HTTP_GET, []() {
    Serial.println("[GET] Caught unresolved Jinja CSS tag!");
    applyCORS();
    server.send_P(200, "text/css", SCHEDULE_STYLE_CSS);
  });

  // Standard static file routes mapped to their proper C++ PROGMEM underscore headers
  server.on("/static/schedule-core.js", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-core.js");
    applyCORS();
    server.send_P(200, "application/javascript", SCHEDULE_CORE_JS);
  });
  server.on("/static/schedule-style.css", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-style.css");
    applyCORS();
    server.send_P(200, "text/css", SCHEDULE_STYLE_CSS);
  });
  server.on("/static/schedule-actions.js", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-actions.js");
    applyCORS();
    server.send_P(200, "application/javascript", SCHEDULE_ACTIONS_JS);
  });
  server.on("/static/schedule-interactions.js", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-interactions.js");
    applyCORS();
    server.send_P(200, "application/javascript", SCHEDULE_INTERACTIONS_JS);
  });
  server.on("/static/schedule-utils.js", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-utils.js");
    applyCORS();
    server.send_P(200, "application/javascript", SCHEDULE_UTILS_JS);
  });
  server.on("/static/schedule-ui.js", HTTP_GET, []() {
    Serial.println("[GET] /static/schedule-ui.js");
    applyCORS();
    server.send_P(200, "application/javascript", SCHEDULE_UI_JS);
  });

  // ==========================================
  // 2. API ENDPOINTS (Flask Emulation)
  // ==========================================

  // GET: /schedule/json
  server.on("/schedule/json", HTTP_GET, []() {
    Serial.println("[GET] /schedule/json hit");
    applyCORS();
    
    DynamicJsonDocument doc(4096); 
    // Iterate map and inject the raw JSON strings seamlessly using serialized()
    for (auto const& item : SCHEDULE_DATA) {
      doc[item.first] = serialized(item.second); 
    }
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // POST: /schedule/set
  server.on("/schedule/set", HTTP_POST, []() {
    Serial.println("[POST] /schedule/set hit");
    applyCORS();

    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"status\": \"error\", \"message\": \"No payload\"}");
      return;
    }

    String payload = server.arg("plain");
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      server.send(400, "application/json", "{\"status\": \"error\", \"message\": \"Invalid JSON\"}");
      return;
    }

    String event_id = doc["id"].as<String>();
    
    // Check if new event (id is missing, null, empty, or 0)
    if (doc["id"].isNull() || event_id == "null" || event_id == "0" || event_id == "") {
      int max_id = 0;
      for (auto const& item : SCHEDULE_DATA) {
        int current_id = item.first.toInt();
        if (current_id > max_id) {
          max_id = current_id;
        }
      }
      event_id = String(max_id + 1);
      doc["id"] = event_id; // Update JSON document with new ID
    }

    // Reserialize and save to map
    String updated_json;
    serializeJson(doc, updated_json);
    SCHEDULE_DATA[event_id] = updated_json;

    Serial.print("\n=== EVENT "); Serial.print(event_id); Serial.println(" SET ===");
    Serial.println(updated_json);
    Serial.println("============================\n");

    DynamicJsonDocument resDoc(256);
    resDoc["status"] = "success";
    resDoc["id"] = event_id;
    String response;
    serializeJson(resDoc, response);

    server.send(200, "application/json", response);
  });

  // POST: /schedule/delete
  server.on("/schedule/delete", HTTP_POST, []() {
    Serial.println("[POST] /schedule/delete hit");
    applyCORS();

    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"status\": \"error\", \"message\": \"No payload\"}");
      return;
    }

    String payload = server.arg("plain");
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, payload);

    if (error || !doc.containsKey("id")) {
      server.send(400, "application/json", "{\"status\": \"error\", \"message\": \"Invalid ID\"}");
      return;
    }

    String event_id = doc["id"].as<String>();
    
    // Erase if exists
    if (SCHEDULE_DATA.count(event_id) > 0) {
      SCHEDULE_DATA.erase(event_id);
      Serial.print("\n=== EVENT "); Serial.print(event_id); Serial.println(" DELETED ===");
      Serial.println("================================\n");
    }

    server.send(200, "application/json", "{\"status\": \"success\"}");
  });

  // ==========================================
  // 3. 404 NOT FOUND & CORS PREFLIGHT CATCHER
  // ==========================================
  server.onNotFound([]() {
    applyCORS(); // Always apply CORS even on errors

    // Browser preflight check for POST/DELETE methods
    if (server.method() == HTTP_OPTIONS) {
      Serial.println("[OPTIONS] Preflight request approved.");
      server.send(204); // 204 No Content
    } else {
      Serial.print("[404] Missed route: ");
      Serial.println(server.uri());
      server.send(404, "text/plain", "404: Not Found");
    }
  });
}

void setup() {
  Serial.begin(115200);
  
  // --- WiFi Setup ---
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected.");
  Serial.print("Access your app at: http://");
  Serial.print(WiFi.localIP());
  Serial.println("/schedule");
  Serial.println("----------------------------------------");

  setupRoutes();
  server.begin();
}

void loop() {
  server.handleClient();
}