from flask import Blueprint, jsonify

bp = Blueprint('food', __name__, url_prefix='/food')


@bp.route('/', methods=['GET'])
def index():
    return jsonify({'message': 'Food database endpoint'})


@bp.route('/search', methods=['GET'])
def search():
    return jsonify({'message': 'Search food endpoint'})


@bp.route('/logs', methods=['GET', 'POST'])
def logs():
    return jsonify({'message': 'Food logs endpoint'})
