class Model {
  constructor(gl, objSrc) {
    this.gl = gl;
    this.objSrc = objSrc;
    this.modelMatrix = new Matrix4();

    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.numVertices = 0;
    
    this.init();
  }

  async init() {
    try {
      // Use the OBJLoader class from the script provided by the course
      const loader = new OBJLoader(this.objSrc);
      await loader.parseModel();
      
      // isFullyLoaded is a custom property from your specific loader
      if (loader.isFullyLoaded) {
        const drawingInfo = loader.getModelData();
        
        this.vertexBuffer = this.createBuffer(drawingInfo.vertices, this.gl.ARRAY_BUFFER);
        this.normalBuffer = this.createBuffer(drawingInfo.normals, this.gl.ARRAY_BUFFER);
        this.numVertices = drawingInfo.vertices.length / 3;
        console.log(`Successfully loaded model from ${this.objSrc}`);
      } else {
        throw new Error(`Failed to fully load model from: ${this.objSrc}`);
      }

    } catch (error) {
      console.error(error);
    }
  }

  createBuffer(data, type) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, data, this.gl.STATIC_DRAW);
    return buffer;
  }

  draw(program) {
    // Wait until the data is loaded and buffers are ready
    if (!this.vertexBuffer || !this.normalBuffer) {
      return;
    }

    const gl = this.gl;

    // --- Model-Specific Drawing ---
    // Turn OFF textures and set a base color, because this loader doesn't support UVs.
    const u_UseTexture = gl.getUniformLocation(program, "u_UseTexture");
    gl.uniform1i(u_UseTexture, false);
    const u_BaseColor = gl.getUniformLocation(program, "u_BaseColor");
    gl.uniform4f(u_BaseColor, 0.8, 0.8, 0.8, 1.0); // Set color to grey

    // Bind attributes
    this.bindAttribute(program, 'a_Position', this.vertexBuffer, 3);
    this.bindAttribute(program, 'a_Normal', this.normalBuffer, 3);

    // Disable the texture coordinate attribute for this draw call
    const a_TexCoord = gl.getAttribLocation(program, "a_TexCoord");
    gl.disableVertexAttribArray(a_TexCoord);

    // Set matrix uniforms
    const u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);

    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.modelMatrix);
    normalMatrix.transpose();
    const u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // Draw the model
    gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
  }

  bindAttribute(program, attribName, buffer, size) {
    const gl = this.gl;
    const attrib = gl.getAttribLocation(program, attribName);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
  }
}