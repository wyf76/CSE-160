class Point {
    constructor() {
      this.position = [0, 0];
      this.color = [1, 1, 1, 1];
      this.size = 10;
    }
  
    render() {
      gl.uniform4fv(u_FragColor, this.color);
      gl.uniform1f(u_Size, this.size);
      gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
      gl.drawArrays(gl.POINTS, 0, 1);
    }
  }
  