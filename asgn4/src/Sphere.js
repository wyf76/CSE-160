// src/Sphere.js

class Sphere {
  constructor(gl, texture, segments = 20) {
    this.gl = gl;
    this.texture = texture;
    this.modelMatrix = new Matrix4();

    // Generate vertices, normals, UVs, and now indices
    let data = this.generateSphereData(segments);
    this.vertices = new Float32Array(data.vertices);
    this.normals = new Float32Array(data.normals);
    this.uvs = new Float32Array(data.uvs);
    this.indices = new Uint16Array(data.indices); // Use Uint16Array for indices
    this.indexCount = this.indices.length;

    // Create all necessary buffers, including the new index buffer
    this.vertexBuffer = this.createBuffer(this.vertices, gl.ARRAY_BUFFER);
    this.normalBuffer = this.createBuffer(this.normals, gl.ARRAY_BUFFER);
    this.uvBuffer = this.createBuffer(this.uvs, gl.ARRAY_BUFFER);
    this.indexBuffer = this.createBuffer(this.indices, gl.ELEMENT_ARRAY_BUFFER);
  }

  createBuffer(data, type) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, data, gl.STATIC_DRAW);
    return buffer;
  }

  generateSphereData(segments) {
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let latNumber = 0; latNumber <= segments; latNumber++) {
      let theta = (latNumber * Math.PI) / segments;
      let sinTheta = Math.sin(theta);
      let cosTheta = Math.cos(theta);

      for (let longNumber = 0; longNumber <= segments; longNumber++) {
        let phi = (longNumber * 2 * Math.PI) / segments;
        let sinPhi = Math.sin(phi);
        let cosPhi = Math.cos(phi);

        let x = cosPhi * sinTheta;
        let y = cosTheta;
        let z = sinPhi * sinTheta;
        let u = 1 - longNumber / segments;
        let v = 1 - latNumber / segments;

        normals.push(x, y, z);
        uvs.push(u, v);
        vertices.push(x, y, z);
      }
    }

    for (let latNumber = 0; latNumber < segments; latNumber++) {
      for (let longNumber = 0; longNumber < segments; longNumber++) {
        let first = latNumber * (segments + 1) + longNumber;
        let second = first + segments + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return { vertices, normals, uvs, indices };
  }

  draw(program) {
    const gl = this.gl;

    // Bind vertex, normal, and UV attributes
    this.bindAttribute(program, 'a_Position', this.vertexBuffer, 3);
    this.bindAttribute(program, 'a_Normal', this.normalBuffer, 3);
    this.bindAttribute(program, 'a_TexCoord', this.uvBuffer, 2);

    // Set model matrix and normal matrix uniforms
    const u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.modelMatrix.elements);

    const normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.modelMatrix);
    normalMatrix.transpose();
    const u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    // Bind texture
    const u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u_Sampler, 0);

    // **CHANGE**: Bind the index buffer and use gl.drawElements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  bindAttribute(program, attribName, buffer, size) {
    const gl = this.gl;
    const attrib = gl.getAttribLocation(program, attribName);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
  }
}