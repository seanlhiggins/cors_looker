from flask import Flask, render_template, url_for, request
import pbl
import json

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def home():
    url = pbl.generate()
    return render_template('index.html'
    , url=url
    )

@app.route('/authenticated')
def auth():
    return render_template('authenticated.html')

@app.route('/home', methods=['GET', 'POST'])
def land():
    return render_template('home.html')