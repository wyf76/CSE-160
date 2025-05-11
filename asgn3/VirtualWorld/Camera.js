if (!Vector3.prototype.add) {
  Vector3.prototype.add = function(v) {
    this.elements[0]+=v.elements[0]; this.elements[1]+=v.elements[1]; this.elements[2]+=v.elements[2];
    return this;
  };
}
if (!Vector3.prototype.sub) {
  Vector3.prototype.sub = function(v) {
    this.elements[0]-=v.elements[0]; this.elements[1]-=v.elements[1]; this.elements[2]-=v.elements[2];
    return this;
  };
}
if (!Vector3.prototype.mul) {
  Vector3.prototype.mul = function(s) {
    this.elements[0]*=s; this.elements[1]*=s; this.elements[2]*=s;
    return this;
  };
}
if (!Vector3.cross) {
  Vector3.cross = function(a,b) {
    const ae=a.elements, be=b.elements;
    return new Vector3([
      ae[1]*be[2]-ae[2]*be[1],
      ae[2]*be[0]-ae[0]*be[2],
      ae[0]*be[1]-ae[1]*be[0]
    ]);
  };
}

class Camera {
  constructor() {
    this.eye   = new Vector3([0,0.5,14]);
    this.at    = new Vector3([0,0.5, 0]);
    this.up    = new Vector3([0,  1,  0]);
    this.pitch = 0;
    this.yaw   = -90;
  }

  forward() {
    let f=new Vector3(this.at.elements);
    f.sub(this.eye).normalize().mul(0.5);
    this.eye.add(f); this.at.add(f);
  }
  back() {
    let f=new Vector3(this.at.elements);
    f.sub(this.eye).normalize().mul(0.5);
    this.eye.sub(f); this.at.sub(f);
  }
  left() {
    let f=new Vector3(this.at.elements);
    f.sub(this.eye).normalize(); f.elements[1]=0;
    let s=Vector3.cross(this.up,f).normalize().mul(0.5);
    this.eye.add(s); this.at.add(s);
  }
  right() {
    let f=new Vector3(this.at.elements);
    f.sub(this.eye).normalize(); f.elements[1]=0;
    let s=Vector3.cross(this.up,f).normalize().mul(0.5);
    this.eye.sub(s); this.at.sub(s);
  }
  panLeft(angle) {
    let f=new Vector3(this.at.elements);
    f.sub(this.eye);
    let R=new Matrix4().setRotate(angle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fp=R.multiplyVector3(f);
    this.at = new Vector3(this.eye.elements).add(fp);
    let dir=new Vector3(fp.elements).normalize();
    this.yaw   = Math.atan2(dir.elements[2],dir.elements[0])*180/Math.PI;
    this.pitch = Math.asin(dir.elements[1])*180/Math.PI;
  }
  panRight(angle) { this.panLeft(-angle); }
  rotate(dx,dy) {
    this.yaw   += dx*0.2;
    this.pitch-= dy*0.2;
    this.pitch = Math.max(-89,Math.min(89,this.pitch));
    let ry=this.yaw*Math.PI/180, rp=this.pitch*Math.PI/180;
    let x=Math.cos(rp)*Math.cos(ry), y=Math.sin(rp), z=Math.cos(rp)*Math.sin(ry);
    let f=new Vector3([x,y,z]).normalize();
    this.at = new Vector3(this.eye.elements).add(f);
  }
}