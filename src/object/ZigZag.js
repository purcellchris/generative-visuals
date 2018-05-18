const normalizePath = require('normalize-path-scale');
const BaseObject = require('./BaseObject');
const RND = require('../util/random');
const clamp = require('clamp');

const colors = ['#313F61', '#DF1378', '#0C2AD9', '#FEC3BE', '#DDE4F0', '#7A899C'];

const SVG_PATH =
  'M114.511719,0.69140625 C132.400109,9.47913527 145.568078,17.850229 154.015625,25.8046875 C166.686945,37.7363752 172.812917,45.0168195 177.417969,59.9257813 C182.023021,74.834743 184.399733,80.3385729 177.417969,101.472656 C172.763459,115.562045 164.962678,125.326368 154.015625,130.765625 C128.559337,136.721818 107.697357,141.005672 91.4296875,143.617188 C67.0281825,147.53446 55.0483207,144.124125 33.7695312,157.632812 C12.4907418,171.1415 5.75975046,184.814874 2.9296875,199.800781 C0.0996245364,214.786688 -4.26852839,218.284579 19.03125,235.675781 C42.3310284,253.066984 37.9422432,245.844963 69.859375,249.757812 C101.776507,253.670662 112.114447,248.51889 133.898437,249.757812 C148.421098,250.583761 162.927609,252.622823 177.417969,255.875 C195.315341,273.154626 205.386956,287.080408 207.632812,297.652344 C211.001598,313.510248 204.190453,330.940827 195.007813,338.675781 C185.825172,346.410735 178.427927,345.288375 154.015625,352.023438 C129.603323,358.7585 122.733774,357.107939 105.021484,362.414063 C87.3091947,367.720186 84.6026576,364.90306 69.859375,377.234375 C55.1160924,389.56569 45.643748,400.455667 42.546875,414.667969 C40.482293,424.142836 42.8091159,437.414972 49.5273437,454.484375 C60.1994472,463.392917 78.697494,470.191094 105.021484,474.878906';

function makePath(svgData) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttributeNS(null, 'd', svgData);

  return path;
}

function getColor(colorStyle) {
  const color = new THREE.Color().set(colorStyle);
  const hOff = RND.randomFloat(-1, 1) * (2 / 360);
  const sOff = RND.randomFloat(-1, 1) * 0.01;
  const lOff = RND.randomFloat(-1, 1) * 0.025;
  color.offsetHSL(hOff, sOff, lOff);
  color.r = clamp(color.r, 0, 1);
  color.g = clamp(color.g, 0, 1);
  color.b = clamp(color.b, 0, 1);
  return color;
}

module.exports = class ZigZag extends BaseObject {
  constructor(app) {
    super(app);

    const path = makePath(SVG_PATH);

    const pathSampleCount = 1000;
    const pathPoints = normalizePath(
      Array.from({ length: pathSampleCount }).map((_, i) => {
        const point = path.getPointAtLength(i / pathSampleCount * path.getTotalLength());
        return [point.x, point.y];
      })
    );
    this.pathPoints = pathPoints;

    const palette = colors[RND.randomInt(colors.length)];
    const color = getColor(palette);

    this.points = pathPoints.slice(0);
    this.zigZagIdx = 0;
    const zigZagPoints = this.getZigZagPoints(this.zigZagIdx);

    // TODO: switch to something else? extrude-polyline?
    const curve = new THREE.CatmullRomCurve3(zigZagPoints.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    curve.tension = 0.8;
    curve.curveType = 'catmullrom';
    const geometry = new THREE.TubeGeometry(curve, 1024, 0.05, 4, false);
    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);

    this.mesh.position.set(0, -1.5, 0);
    this.mesh.scale.set(0.5, 0.5, 0.5);

    this.add(this.mesh);
  }

  getZigZagPoints(idx) {
    const zigZagPoints = this.pathPoints.map((_, i) => {
      const finalIdx = (i + idx) % this.pathPoints.length;
      const finalPoint = this.pathPoints[finalIdx];
      const yOffset = Math.floor((i + idx) / this.pathPoints.length) * 2;

      return [finalPoint[0], finalPoint[1] + yOffset];
    });

    return zigZagPoints;
  }

  update() {
    this.zigZagIdx += 1;
    const zigZagPoints = this.getZigZagPoints(this.zigZagIdx);
    const curve = new THREE.CatmullRomCurve3(zigZagPoints.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    curve.tension = 0.8;
    curve.curveType = 'chordal';
    const geometry = new THREE.TubeGeometry(curve, 256, 0.05, 4, false);
    this.mesh.geometry = geometry;
  }
};
