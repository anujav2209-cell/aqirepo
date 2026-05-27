from flask import Flask, render_template, request, jsonify
from model import train_and_predict

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data or "city" not in data:
        return jsonify({
            "error": "Please provide a city name."
        }), 400

    city = data["city"]
    prediction_data = train_and_predict(city)

    if prediction_data is None:
        return jsonify({
            "error": f"Could not find sufficient PM2.5 air quality data near '{city}'. Please enter a city in Kerala, or enter another Indian state."
        })

    return jsonify(prediction_data)


if __name__ == "__main__":
    app.run(debug=True)