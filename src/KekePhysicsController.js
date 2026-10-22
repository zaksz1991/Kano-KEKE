export class KekePhysicsController {
  constructor(kekeGroup) {
    this.group = kekeGroup;
    this.velocity = 0;
    this.currentSpeed = 0;
    this.maxSpeed = 25;
    this.acceleration = 12;
    this.braking = 20;
    this.friction = 8;
    this.steeringAngle = 0;
    this.maxSteerAngle = 0.6;
    
    this.throttleInput = 0;
    this.steerInput = 0;
  }

  setInput(throttle, steer) {
    this.throttleInput = throttle;
    this.steerInput = steer;
  }

  update(delta) {
    if (this.throttleInput !== 0) {
      this.velocity += this.throttleInput * this.acceleration * delta;
    } else {
      if (this.velocity > 0) {
        this.velocity = Math.max(0, this.velocity - this.friction * delta);
      } else if (this.velocity < 0) {
        this.velocity = Math.min(0, this.velocity + this.friction * delta);
      }
    }

    this.velocity = Math.max(-8, Math.min(this.maxSpeed, this.velocity));
    this.currentSpeed = Math.abs(this.velocity);

    if (this.steerInput !== 0 && Math.abs(this.velocity) > 0.5) {
      this.steeringAngle += this.steerInput * 1.5 * delta;
      this.steeringAngle = Math.max(-this.maxSteerAngle, Math.min(this.maxSteerAngle, this.steeringAngle));
      
      const turnRate = (this.velocity / this.maxSpeed) * this.steeringAngle * 2.0;
      this.group.rotation.y += turnRate * delta;
    } else {
      this.steeringAngle *= (1 - 5 * delta);
    }

    this.group.translateZ(this.velocity * delta);
  }
}