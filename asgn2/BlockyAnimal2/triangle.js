class Triangle{
  constructor() {
      this.type = 'triangle';
      this.position = [0.0,0.0,0.0];
      this.color = [1.0,1.0,1.0,1.0];
      this.size = 5.0;
  }

  render() {
      var xy = this.position;                                       
      var rgba = this.color;                                         
      var size = this.size;                                           
         
      // Pass the color of a point to u_FragColor variable
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      gl.uniform1f(u_Size, size);                                   
                              
      var d = this.size/200.0;   

      var height = d * Math.sqrt(3)/2;

      var x1 = xy[0];               
      var y1 = xy[1] + height/2;
      
      var x2 = xy[0] - d/2;         
      var y2 = xy[1] - height/2;
      
      var x3 = xy[0] + d/2;        
      var y3 = xy[1] - height/2;
      
      
      drawTriangle([x1, y1, x2, y2, x3, y3]);    
  }
}

function drawTriangle(vertices) {
  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  
  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// function drawTriangle3D(vertices) {
//   // Calculate the number of vertices based on the input array length
//   // Each vertex has 3 components (x, y, z)
//   var n = vertices.length / 3; // Correct calculation for n
//   if (n < 3) return; // Check if there's at least one triangle

//   var vertexBuffer = gl.createBuffer();
//   if(!vertexBuffer) {
//       console.log('Failed to create the buffer object');
//       return -1;
//   }

//   // Bind the buffer object to target
//   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//   // Write date into the buffer object
//   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

//   // Assign the buffer object to a_Position variable
//   gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

//   // Enable the assignment to a_Position variable
//   gl.enableVertexAttribArray(a_Position);

//   // Draw ALL the triangles defined in the vertices array
//   gl.drawArrays(gl.TRIANGLES, 0, n); // Use calculated n

//   // Optional cleanup
//   // gl.bindBuffer(gl.ARRAY_BUFFER, null);
//   // gl.disableVertexAttribArray(a_Position);
// }