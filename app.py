# app.py
from flask import Flask, render_template, jsonify

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

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/schedule/json')
def schedule_json():
    return jsonify(SCHEDULE_DATA)

if __name__ == '__main__':
    app.run(debug=True)