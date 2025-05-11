class Cone {
    constructor(segments = 10) { // Allow customizing segments
        this.type = 'cone';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.segments = segments;

        // Generate cone vertices only once
        let coneVertices = [];
        let radius = 0.5;
        let height = 1.0; // Apex at (0, height, 0), base at y=0

        for (let i = 0; i < this.segments; i++) {
            let angle1 = (i / this.segments) * 2 * Math.PI;
            let angle2 = ((i + 1) / this.segments) * 2 * Math.PI;

            let x1 = Math.cos(angle1) * radius;
            let z1 = Math.sin(angle1) * radius;
            let x2 = Math.cos(angle2) * radius;
            let z2 = Math.sin(angle2) * radius;

            // Base triangle (center 0,0,0 to edge)
            coneVertices.push(0, 0, 0, x1, 0, z1, x2, 0, z2);

            // Side triangle (edge to apex 0,height,0)
            coneVertices.push(x1, 0, z1, x2, 0, z2, 0, height, 0);
        }
        this.vertices = new Float32Array(coneVertices);
        this.vertexCount = this.vertices.length / 3;

        // Create vertex buffer only once
        this.vertexBuffer = gl.createBuffer();
         if (!this.vertexBuffer) {
            console.log('Failed to create the buffer object for Cone');
            return;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null); // Unbind
    }

    render() {
        if (!this.vertexBuffer) {
             console.error("Cone vertexBuffer not initialized");
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

        // Optional: Disable vertex attrib array
        // gl.disableVertexAttribArray(a_Position);
    }
}