class Cube {
  constructor(gl, texture) {
    this.gl = gl;
    this.texture = texture;
    this.modelMatrix = new Matrix4();
    this._initBuffer();
  }

  _initBuffer() {
    const gl = this.gl;
    // Vertex data: x,y,z, u,v
    const vertices = new Float32Array([
      // front
      -0.5,-0.5, 0.5, 0,0,   0.5,-0.5, 0.5, 1,0,   0.5, 0.5, 0.5, 1,1,
      -0.5,-0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,1,  -0.5, 0.5, 0.5, 0,1,
      // right
       0.5,-0.5, 0.5, 0,0,   0.5,-0.5,-0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
       0.5,-0.5, 0.5, 0,0,   0.5, 0.5,-0.5, 1,1,   0.5, 0.5, 0.5, 0,1,
      // back
      -0.5,-0.5,-0.5, 0,0,   0.5,-0.5,-0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
      -0.5,-0.5,-0.5, 0,0,   0.5, 0.5,-0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
      // left
      -0.5,-0.5, 0.5, 0,0,  -0.5, 0.5, 0.5, 1,0,  -0.5, 0.5,-0.5, 1,1,
      -0.5,-0.5, 0.5, 0,0,  -0.5, 0.5,-0.5, 1,1,  -0.5,-0.5,-0.5, 0,1,
      // top
      -0.5, 0.5, 0.5, 0,0,   0.5, 0.5, 0.5, 1,0,   0.5, 0.5,-0.5, 1,1,
      -0.5, 0.5, 0.5, 0,0,   0.5, 0.5,-0.5, 1,1,  -0.5, 0.5,-0.5, 0,1,
      // bottom
      -0.5,-0.5, 0.5, 0,0,   0.5,-0.5, 0.5, 1,0,   0.5,-0.5,-0.5, 1,1,
      -0.5,-0.5, 0.5, 0,0,   0.5,-0.5,-0.5, 1,1,  -0.5,-0.5,-0.5, 0,1
    ]);
    this.vertexCount = 36;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  draw(a_Position, a_TexCoord, u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Sampler,
       viewMatrix, projMatrix) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_Position);
    gl.enableVertexAttribArray(a_TexCoord);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix,  false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix,  false, projMatrix.elements);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u_Sampler, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }
}