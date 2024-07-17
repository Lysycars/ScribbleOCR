import cv2
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from mltu.configs import BaseModelConfigs
from mltu.utils.text_utils import ctc_decoder, get_cer, get_wer  # Import ctc_decoder function
from mltu.inferenceModel import OnnxInferenceModel
from mltu.transformers import ImageResizer

app = Flask(__name__)
CORS(app)

class ImageToWordModel(OnnxInferenceModel):
    def __init__(self, char_list: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.char_list = char_list

    def predict(self, image: np.ndarray):
        image = ImageResizer.resize_maintaining_aspect_ratio(image, *self.input_shapes[0][1:3][::-1])
        image_pred = np.expand_dims(image, axis=0).astype(np.float32)
        preds = self.model.run(self.output_names, {self.input_names[0]: image_pred})[0]
        text = ctc_decoder(preds, self.char_list)[0]
        return text

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    # Read the image file
    image = cv2.imdecode(np.frombuffer(file.read(), np.uint8), cv2.IMREAD_COLOR)

    # Load the model and perform prediction
    configs = BaseModelConfigs.load("ScribbleOCR/Models/Sentence/configs.yaml")
    model = ImageToWordModel(char_list=configs.vocab, model_path=configs.model_path)
    prediction_text = model.predict(image)

    return jsonify({'prediction': prediction_text})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
