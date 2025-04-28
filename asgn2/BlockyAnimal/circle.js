class Circle {
    constructor() {
      this.position = [0, 0];
      this.color = [1, 1, 1, 1];
      this.size = 10;
      this.segments = 10;
    }
  
    render() {
      gl.uniform4fv(u_FragColor, this.color);
      gl.uniform1f(u_Size, this.size);
  
      const [x, y] = this.position;
      const d = this.size / 200;
      const angleStep = (2 * Math.PI) / this.segments;
  
      const vertices = [x, y];
      for (let i = 0; i <= this.segments; ++i) {
        vertices.push(
          x + d * Math.cos(i * angleStep),
          y + d * Math.sin(i * angleStep)
        );
      }
  
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  
      gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, this.segments + 2);
    }
  }
  