class Cube {
  constructor(gl, texture) {
    this.gl = gl;
    this.texture = texture;
    this.modelMatrix = new Matrix4();

    // prettier-ignore
    const vertices = new Float32Array([
      // front
      -0.5, -0.5, 0.5, 0, 0,  0.5, -0.5, 0.5, 1, 0,   0.5, 0.5, 0.5, 1, 1,
      -0.5, -0.5, 0.5, 0, 0,  0.5, 0.5, 0.5, 1, 1,  -0.5, 0.5, 0.5, 0, 1,
      // right
      0.5, -0.5, 0.5, 0, 0,   0.5, -0.5, -0.5, 1, 0,   0.5, 0.5, -0.5, 1, 1,
      0.5, -0.5, 0.5, 0, 0,   0.5, 0.5, -0.5, 1, 1,   0.5, 0.5, 0.5, 0, 1,
      // back
      -0.5, -0.5, -0.5, 0, 0,  0.5, -0.5, -0.5, 1, 0,   0.5, 0.5, -0.5, 1, 1,
      -0.5, -0.5, -0.5, 0, 0,  0.5, 0.5, -0.5, 1, 1,  -0.5, 0.5, -0.5, 0, 1,
      // left
      -0.5, -0.5, 0.5, 0, 0,  -0.5, 0.5, 0.5, 1, 0,  -0.5, 0.5, -0.5, 1, 1,
      -0.5, -0.5, 0.5, 0, 0,  -0.5, 0.5, -0.5, 1, 1,  -0.5, -0.5, -0.5, 0, 1,
      // top
      -0.5, 0.5, 0.5, 0, 0,   0.5, 0.5, 0.5, 1, 0,   0.5, 0.5, -0.5, 1, 1,
      -0.5, 0.5, 0.5, 0, 0,   0.5, 0.5, -0.5, 1, 1,  -0.5, 0.5, -0.5, 0, 1,
      // bottom
      -0.5, -0.5, 0.5, 0, 0,   0.5, -0.5, 0.5, 1, 0,   0.5, -0.5, -0.5, 1, 1,
      -0.5, -0.5, 0.5, 0, 0,   0.5, -0.5, -0.5, 1, 1,  -0.5, -0.5, -0.5, 0, 1,
    ]);
    this.vertexCount = 36;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // prettier-ignore
    const normals = new Float32Array([
        // Front face (0,0,1)
        0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
        // Right face (1,0,0)
        1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
        // Back face (0,0,-1)
        0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
        // Left face (-1,0,0)
       -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        // Top face (0,1,0)
        0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
        // Bottom face (0,-1,0)
        0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0
    ]);
    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
  }

  draw(program) {
    const gl = this.gl;
    const FSIZE = Float32Array.BYTES_PER_ELEMENT;

    // --- Set up vertex buffer ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const a_Position = gl.getAttribLocation(program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);

    const a_TexCoord = gl.getAttribLocation(program, "a_TexCoord");
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
    gl.enableVertexAttribArray(a_TexCoord);

    // --- Set up normal buffer ---
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    const a_Normal = gl.getAttribLocation(program, "a_Normal");
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // --- Set up model matrix ---
    const u_ModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);

    // --- Set up normal matrix ---
    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.modelMatrix);
    normalMatrix.transpose();
    const u_NormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // --- Set up texture ---
    const u_Sampler = gl.getUniformLocation(program, "u_Sampler");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u_Sampler, 0);

    // --- Draw the cube ---
    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }
}