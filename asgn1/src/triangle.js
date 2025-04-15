class Triangle {
    constructor() {
      this.position = [0, 0]; // Center
      this.color = [1, 1, 1, 1];
      this.size = 10;
    }
  
    render() {
      gl.uniform4fv(u_FragColor, this.color);
      gl.uniform1f(u_Size, this.size);
  
      const [x, y] = this.position;
      const d = this.size / 200;
  
      const vertices = new Float32Array([
        x, y + d,
        x - d, y - d,
        x + d, y - d
      ]);
  
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
      gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }
  