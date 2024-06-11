---
weight: 1
---
# Quadrille Renderer

{{< p5-iframe sketch="/graphics-playground/sketches/quadrille-renderer/sketch.js" lib1= "https://cdn.jsdelivr.net/gh/objetos/p5.quadrille.js/p5.quadrille.js" width="450" height="450" >}}

## What is `quadrille.js`?

In words of [J.P Charalambos](https://nakednous.github.io/) (the mastermind of this library): 
> [p5.quadrille.js](https://github.com/objetos/p5.quadrille.js) is an open-source p5.js library tailored for students, visual artists, and game designers. It supports the creation of [puzzle](https://en.wikipedia.org/wiki/Puzzle_video_game) and board games and the exploration of visual algorithms.

## Motivation.

I've always been a fan of retro video games—the captivating music, the optimized gameplay, and that distinctive pixelated aesthetic. When I started studying the `quadrille.js` library, the first applications that came to mind were grid-based games like chess, sudoku, or sokoban. That was until I discovered the [`rasterizeTriangle()`](https://objetos.github.io/p5.quadrille.js/docs/visual_algorithms/rasterize_triangle/) functionality.

This method allows you to visually approximate a triangle, the fundamental polygon in computer graphics and rendering, from three given cells. Considering this, I thought, if it's possible to rasterize a triangle, then it's possible to at least generate a software renderer.

## Building the Quadrille Software Renderer.

First of all, it's necessary to mention that I guided the steps for building the software renderer using the document [Apuntes sobre programación de gráficos 3D](https://docs.hektorprofe.net/graficos-3d/) by Hector Costa. This document provides a step-by-step development of a renderer in `C++`.

There was no need to reinvent the wheel, so I only implemented/adapted certain components of a rendering engine. Others, like the color buffer and basic point drawing, were already provided by `p5.js` and `quadrille.js`, respectively.



### Vectors and Matrices

Vectors are everything in rendering. Without them, you wouldn't be able to use the camera, position your objects, or even have any point on the monitor. Matrices are the transformations within this world. They handle the movement of elements in a scene, their resizing, and the way we observe them.

For simplicity, I implemented them as plain JavaScript arrays, so they look like this:
```
let vector_2D = [x, y];
let vector_3D = [x, y, z];
let matrix = [
  [a, b, c], 
  [d, e, f],
  [g, h, i]
];
```

### Applying Transformations

To quickly apply a linear transformation to a vector, multiply the vector by a matrix; the result will be the transformed vector. Since I didn't plan on handling too many points at once, I'm using a conventional matrix multiplication function.

```
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
```

### Rotation and Perspective Projection

Both are linear transformations: one results in a vector rotated by a certain angle (I handle this in radians) and the other projects a three-dimensional vector onto a plane, in this case, the screen; which means it goes from having three components to only two.

To rotate around the X-axis and project a vector, I implemented these simple functions:

```
function rotX(v, ang){
  rm = [[1, 0, 0], 
        [0, cos(ang), -sin(ang)], 
        [0, sin(ang), cos(ang)]]
  return axbQMatrix([v], rm)[0];
}

function qPerspective(point, fov, cam, center){
  let p = [... point];
  p[2] -= cam[2];
  pm = [[fov / p[2], 0], 
        [0, fov / p[2]], 
        [center[0] / p[2], center[1] / p[2]]];
  return axbQMatrix([p], pm)[0];
}
```
We will also want to apply these transformations en masse to sets of points rather than just one.
```
function qRotateX(points, ang){
  for (let i = 0; i < points.length; i++){
    //console.log('Punto:',i , points[i]);
    points[i] = rotX(points[i], ang);
  }
  return points;
}

function proy(points, fov, cam, center){  
  let proy_points = []
  for (let i = 0; i < points.length; i++){
    proy_points.push(qPerspective(points[i], fov, cam, center));
  } 
  return proy_points;
}
```

## Vertices, Triangles, and Meshes

Thanks to its simplicity, the triangle can compose any polygon that one might propose, forming the basis of any 3D model. A triangle consists of three vertices, and these are represented as points in space.

A mesh is a collection of vertices and the triangles they form. We will use these two components to define a cube.

```
...
let cubo;
...
function setup(){
    ...
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
    ...
}
```

It's important to be able to handle a triangle directly from the vertices that compose it, that is, as a set of points represented as a matrix.

```
let triang = [
    [x0, y0, z0],
    [x1, y1, z1], 
    [x2, y2, z2]
];
```
This is why I implemented a method to read the vertex labels in a mesh and thus obtain a triangle that's easier to handle. As with the transformations, another function was implemented to apply this in series to the entire mesh and transform it into a single set of triangles.
```
function triang(shp, labels){
  let qTriangle = [];
  for (let i = 0; i < labels.length; i++){    qTriangle.push(shp.vertices[labels[i]]);  
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
```
Finally, projection functions are used to transform the triangles into screen space.
```
function qProyectTriangles(triangles, fov, cam, center){
  let triang2D = [];
  for (let i = 0; i < triangles.length; i++){
    triang2D.push(proy(triangles[i], fov, cam, center));
  }
  return triang2D;
}
```
### Discrete Lines

The [Bresenham's Algorithm](https://en.wikipedia.org/wiki/Bresenham's_line_algorithm) allows us to represent a line in a discrete space, in this case, a grid. The variant I implemented applies a floor function to the points of the function to ensure integer values and correctly reference the cells.
```
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
  let e;

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

```

Similarly, these lines are used to represent a single triangle, and finally, they can be applied to a set of these elements.

```
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

```

### Drawing the cube.

I simulated the camera solely with a vector having a non-zero value in its *z* component and assigning a field of view (fov). Additionally, the origin (coordinate center) was defined as the center of the grid.

```
...

let qCam, origen, fov;

function setup(){
    ...
    qCam = [0, 0, -4];
    origen = [ROWS / 2, COLS / 2];
    fov = 50; 
    ...
}
``` 
Finally, the functions are applied sequentially to correctly render the cube. It's important to remember that transformations are always applied before projection.

```
function draw() {
  background(0);
  quadrille.clear();
  
  qRotateX(cubo.vertices, 0.06);  
  let triangs3D = qTriangles(cubo);
  let triangs2D = qProyectTriangles(triangs3D, fov, qCam, origen);
  qRenderLines(triangs2D, quadrille, color(255));
  
  drawQuadrille(quadrille, {outline: 'green' });
} 
```

## Future Work

This experiment yielded promising results considering the simplicity of the implementation. In case of continuing with the development of a software renderer based on `quadrille.js`, optimizations such as face culling and z-buffering are desired to be implemented. Additionally, studying the performance of Quadrille when rendering multiple solids using cells as pixels would be beneficial. Once this process is complete, consideration could be given to expanding the tool by supporting more primitives and beginning the integration of lighting models.
