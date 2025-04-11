function main() {
  let canvas = document.getElementById('example')
  if (!canvas) return
  let ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function drawVector(v, color, ctx) {
  let centerX = 200
  let centerY = 200
  let scale = 20
  let x = v.elements[0] * scale
  let y = v.elements[1] * scale

  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(centerX + x, centerY - y)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

function handleDrawEvent() {
  let canvas = document.getElementById('example')
  let ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let x1 = parseFloat(document.getElementById("xInput").value)
  let y1 = parseFloat(document.getElementById("yInput").value)
  let v1 = new Vector3([x1, y1, 0])

  let x2 = parseFloat(document.getElementById("xInput2").value)
  let y2 = parseFloat(document.getElementById("yInput2").value)
  let v2 = new Vector3([x2, y2, 0])

  drawVector(v1, "red", ctx)
  drawVector(v2, "blue", ctx)
}

function handleDrawOperationEvent() {
  let canvas = document.getElementById('example')
  let ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let x1 = parseFloat(document.getElementById("xInput").value)
  let y1 = parseFloat(document.getElementById("yInput").value)
  let v1 = new Vector3([x1, y1, 0])

  let x2 = parseFloat(document.getElementById("xInput2").value)
  let y2 = parseFloat(document.getElementById("yInput2").value)
  let v2 = new Vector3([x2, y2, 0])

  drawVector(v1, "red", ctx)
  drawVector(v2, "blue", ctx)

  let op = document.getElementById("operation").value
  let s = parseFloat(document.getElementById("scalarInput").value)

  if (op === "add") {
    let v3 = v1.add(v2)
    drawVector(v3, "green", ctx)
  } else if (op === "sub") {
    let v3 = v1.sub(v2)
    drawVector(v3, "green", ctx)
  } else if (op === "mul") {
    let v3 = v1.mul(s)
    let v4 = v2.mul(s)
    drawVector(v3, "green", ctx)
    drawVector(v4, "green", ctx)
  } else if (op === "div") {
    let v3 = v1.div(s)
    let v4 = v2.div(s)
    drawVector(v3, "green", ctx)
    drawVector(v4, "green", ctx)
  } else if (op === "magnitude") {
    console.log("Magnitude v1:", v1.magnitude())
    console.log("Magnitude v2:", v2.magnitude())
  } else if (op === "normalize") {
    drawVector(v1.normalize(), "green", ctx)
    drawVector(v2.normalize(), "green", ctx)
  } else if (op === "angle") {
    let angle = angleBetween(v1, v2)
    console.log("Angle (radians):", angle)
  } else if (op === "area") {
    let area = areaTriangle(v1, v2)
    console.log("Triangle area:", area)
  }
}

function angleBetween(v1, v2) {
  let dotVal = Vector3.dot(v1, v2)
  let mags = v1.magnitude() * v2.magnitude()
  return Math.acos(dotVal / mags)
}

function areaTriangle(v1, v2) {
  return Vector3.cross(v1, v2).magnitude() / 2
}
