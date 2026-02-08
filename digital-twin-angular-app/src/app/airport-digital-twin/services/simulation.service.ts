import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  private simulationSpeed = new BehaviorSubject<number>(1);
  private isRunning = new BehaviorSubject<boolean>(true);

  setSimulationSpeed(speed: number): void {
    this.simulationSpeed.next(speed);
  }

  updateSimulation(): void {
    // Update simulation logic here
  }

  getSimulationSpeed() {
    return this.simulationSpeed.asObservable();
  }
}