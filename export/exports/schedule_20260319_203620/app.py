# app.py
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

SCHEDULE_DATA = {
    "1": {
        "id": "1",
        "commands": ['"$led_set_rgb 255 0 0" "$led turn_off"'],
        "color": "#33FF33",
        "day": 0,
        "start_time": 540,
        "end_time": 600
    },
    "2": {
        "id": "2",
        "commands": ['"$led_set_rgb 0 255 0" "$led turn_on"'],
        "color": "#33FF33",
        "day": 1,
        "start_time": 600,
        "end_time": 660
    }
}


@app.route('/schedule')
def home():
    return render_template('schedule.html')


@app.route('/schedule/json')
def schedule_json():
    return jsonify(SCHEDULE_DATA)


@app.route('/schedule/set', methods=['POST'])
def schedule_set():
    global SCHEDULE_DATA
    single_event = request.get_json()

    if single_event and "id" in single_event:
        event_id = str(single_event["id"])

        # If this is a new event (ID not in database), assign a backend ID
        if event_id not in SCHEDULE_DATA:
            # Find the highest existing integer ID and add 1
            existing_ids = [int(k) for k in SCHEDULE_DATA.keys() if k.isdigit()]
            new_id = str(max(existing_ids + [0]) + 1)

            single_event["id"] = new_id
            event_id = new_id

        # Update or add the single event
        SCHEDULE_DATA[event_id] = single_event

        print(f"\n=== EVENT {event_id} SET ===")
        print(single_event)
        print("============================\n")
        return jsonify({"status": "success", "id": event_id}), 200

    return jsonify({"status": "error", "message": "Invalid event payload"}), 400


@app.route('/schedule/delete', methods=['POST'])
def schedule_delete():
    global SCHEDULE_DATA
    payload = request.get_json()

    if payload and "id" in payload:
        event_id = str(payload["id"])
        # Remove the event if it exists
        if event_id in SCHEDULE_DATA:
            del SCHEDULE_DATA[event_id]
            print(f"\n=== EVENT {event_id} DELETED ===")
            print("================================\n")
        return jsonify({"status": "success"}), 200

    return jsonify({"status": "error", "message": "Invalid ID"}), 400


if __name__ == '__main__':
    app.run(debug=True)