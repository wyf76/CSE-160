// class Cube {
//   constructor() {
//       this.type = 'cube';
//       //this.position = [0.0, 0.0, 0.0];
//       this.color = [1.0, 1.0, 1.0, 1.0];
//       //this.size = 5;
//       //this.segments = 10.0;
//       this.matrix = new Matrix4();
//   }

//   render() {
//       //var xy = this.position;
//       var rgba = this.color;
//       //var size = this.size;
      
      
//       gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
      
//       gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
      
//       // Front of cube
//       drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
//       drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);

//       // Top of cube
//       gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
//       drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
//       drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

//       // Bottom of cube
//       gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
//       drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
//       drawTriangle3D([0,0,0,  1,0,0,  1,0,1]);

//       // Left side of cube
//       gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
//       drawTriangle3D([1,0,0,  1,1,1,  1,1,0]);
//       drawTriangle3D([1,0,0,  1,0,1,  1,1,1]);

//       // Right side of cube
//       gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
//       drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);
//       drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);

//       // Back of cube
//       gl.uniform4f(u_FragColor, rgba[0]*.7, rgba[1]*.7, rgba[2]*.7, rgba[3]);
//       drawTriangle3D([0,0,1,  1,1,1,  0,1,1]);
//       drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
      
      
//   }

// }
class Cube {
  constructor() {
      this.type = 'cube';
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.matrix = new Matrix4();

      // Define vertices for a unit cube (0,0,0) to (1,1,1)
      // 6 faces * 2 triangles/face * 3 vertices/triangle = 36 vertices
      this.vertices = new Float32Array([
          // Front face
          0,0,0,  1,0,0,  1,1,0,    0,0,0,  1,1,0,  0,1,0,
          // Back face
          0,0,1,  1,0,1,  1,1,1,    0,0,1,  1,1,1,  0,1,1,
          // Top face
          0,1,0,  1,1,0,  1,1,1,    0,1,0,  1,1,1,  0,1,1,
          // Bottom face
          0,0,0,  1,0,0,  1,0,1,    0,0,0,  1,0,1,  0,0,1,
          // Left face
          0,0,0,  0,1,0,  0,1,1,    0,0,0,  0,1,1,  0,0,1,
          // Right face
          1,0,0,  1,1,0,  1,1,1,    1,0,0,  1,1,1,  1,0,1
      ]);
      this.vertexCount = this.vertices.length / 3;

      // Create vertex buffer only once in constructor
      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) {
          console.log('Failed to create the buffer object for Cube');
          return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind buffer
  }

  render() {
      if (!this.vertexBuffer) {
           console.error("Cube vertexBuffer not initialized");
           return;
      }
      // Pass the color
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

      // Pass the matrix
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      // Bind the existing buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

      // Setup attribute pointer
      if (a_Position < 0) { console.log('Failed to get a_Position'); return; }
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

      // Optional: Disable vertex attrib array after drawing
      // gl.disableVertexAttribArray(a_Position);
      // Don't unbind the buffer here if many cubes are drawn sequentially for slight optimization
  }
}