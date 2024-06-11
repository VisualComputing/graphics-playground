const ROWS = 80;
const COLS = 80;
let quadrille;

let cubo;
let qCam;
let fov;
let origen;

function setup() {
  Quadrille.cellLength = 5;
  Quadrille.outlineWeight = 0;
  createCanvas(COLS * Quadrille.cellLength, ROWS * Quadrille.cellLength);
  angleMode(RADIANS);
  console.log(width, height);
  quadrille = createQuadrille(ROWS, COLS);
  cubo = {
    vertices: [
      [-1, -1, -1],  // 0
      [ 1, -1, -1],  // 1
      [-1,  1, -1],  // 2
      [ 1,  1, -1],  // 3
      [-1, -1,  1],  // 4
      [ 1, -1,  1],  // 5
      [-1,  1,  1],  // 6
      [ 1,  1,  1]   // 7
    ],
    triangles: [
      // front    ->
      [1, 0, 2],
      [1, 2, 3],
      // back     <-
      [4, 5, 7],
      [4, 7, 6],
      // right    ->
      [1, 7, 5],
      [1, 3, 7],
      // left     <-
      [4, 2, 0], 
      [4, 6, 2],
      // top      ->
      [2, 7, 3], 
      [2, 6, 7],
      // bottom   <- 
      [1, 5, 4], 
      [1, 4, 0] 
    ]
  };
  qCam = [0, 0, -4];
  origen = [ROWS / 2, COLS / 2];
  fov = 50; 
}

function draw() {
  background(0);
  quadrille.clear();
  
  qRotateX(cubo.vertices, 0.05);  
  let triangs3D = qTriangles(cubo);
  let triangs2D = qProyectTriangles(triangs3D, fov, qCam, origen);
  
  qRenderLines(triangs2D, quadrille, color(255));
  
  drawQuadrille(quadrille, {outline: 'green' });
} 

function colorizeShader({ array: rgb }) {
  return color(rgb);
}

function quaLine(x0, y0, x1, y1, quad, c) {
  x0 = Math.floor(x0);
  x1 = Math.floor(x1);
  y0 = Math.floor(y0);
  y1 = Math.floor(y1);
  let dx = x1 - x0;
  let dy = y1 - y0;
  let x = x0; 
  let y = y0;
  let sx = (dx > 0) ? 1 : -1;
  let sy = (dy > 0) ? 1 : -1;
  dx = Math.abs(dx);
  dy = Math.abs(dy);
  let e = 0;

  if (dx > dy) {
    e = dx / 2;
    while (x != x1) {
      quad.fill(x, y, c);
      x += sx;
      e -= dy;
      if (e < 0) {
        y += sy;
        e += dx;
      }
    }
  } else {
    e = dy / 2;
    while (y != y1) {
      quad.fill(x, y, c);
      y += sy;
      e -= dx;
      if (e < 0) {
        x += sx;
        e += dy;
      }
    }
  }
  quad.fill(x1, y1, c); // Asegura pintar el punto final
}

function qTriangleLine(triang2D, quad, c){
  quaLine(triang2D[0][0], triang2D[0][1], triang2D[1][0], triang2D[1][1], quad, c);
  quaLine(triang2D[0][0], triang2D[0][1], triang2D[2][0], triang2D[2][1], quad, c);
  quaLine(triang2D[1][0], triang2D[1][1], triang2D[2][0], triang2D[2][1], quad, c);
}

function qRenderLines(triangles, quad, c){
  //console.log('renderizando lineas');
  for (let i = 0; i < triangles.length; i++){
    qTriangleLine(triangles[i], quad, c);
  }
}

function triang(shp, labels){
  let qTriangle = [];
  for (let i = 0; i < labels.length; i++){
    qTriangle.push(shp.vertices[labels[i]]);  
  }
  return qTriangle;
}

function qTriangles(shp){
  let qTriangleList = [];
  for (let i = 0; i < shp.triangles.length; i++){
    qTriangleList.push(triang(shp, shp.triangles[i]));
  }
  return qTriangleList;
}

function qProyectTriangles(triangles, fov, cam, center){
  let triang2D = [];
  for (let i = 0; i < triangles.length; i++){
    triang2D.push(proy(triangles[i], fov, cam, center));
  }
  return triang2D;
}

function qRenderer(quad, points, c){
  for (let i = 0; i < points.length; i++){
    
    let ro = Math.floor(points[i][0]);
    let co = Math.floor(points[i][1]);
    quad.fill(ro, co, c);
  }
}

function qPerspective(point, fov, cam, center){
  let p = [... point];
  p[2] -= cam[2];
  pm = [[fov / p[2], 0], 
        [0, fov / p[2]], 
        [center[0] / p[2], center[1] / p[2]]];
  return axbQMatrix([p], pm)[0];
}

function proy(points, fov, cam, center){  
  let proy_points = []
  for (let i = 0; i < points.length; i++){
    proy_points.push(qPerspective(points[i], fov, cam, center));
  }
  
  return proy_points;
}

function rotX(v, ang){
  rm = [[1, 0, 0], 
        [0, cos(ang), -sin(ang)], 
        [0, sin(ang), cos(ang)]]
  return axbQMatrix([v], rm)[0];
}

function qRotateX(points, ang){
  for (let i = 0; i < points.length; i++){
    //console.log('Punto:',i , points[i]);
    points[i] = rotX(points[i], ang);
  }
  return points;
}

function qRotateY(V){
  
}

function qRotateZ(v){
  
}
function axbQMatrix(A, B) {
  
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;

  if (colsA !== rowsB) {
      console.log(rowsA, colsA, rowsB, colsB);
      throw new Error('Las dimensiones de las matrices no son compatibles para la multiplicación.');
  }
  
  const result = [];
  for (let i = 0; i < rowsA; i++) {
      result.push([]);
      for (let j = 0; j < colsB; j++) {
          let sum = 0;
          for (let k = 0; k < colsA; k++) {
              sum += (A[i][k] * B[k][j]);
          }
          
          result[i][j] = sum;
      }
  }
  
  return result;
}
