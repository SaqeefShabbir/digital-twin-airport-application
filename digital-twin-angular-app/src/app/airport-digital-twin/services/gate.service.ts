import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { delay, map, tap, catchError } from 'rxjs/operators';
import { GateStatus, FlightStatus } from '../models/airport-models';

export interface GateAssignment {
  gateId: string;
  flightNumber?: string;
  airline?: string;
  destination?: string;
  scheduledTime?: Date;
  estimatedTime?: Date;
  status: string;
  assignToNext?: boolean;
  nextFlightNumber?: string;
  nextFlightTime?: Date;
  maintenanceReason?: string;
  maintenanceDuration?: number;
  notes?: string;
}

export interface BulkOperation {
  operation: string;
  gateIds: string[];
  parameters?: any;
}

export interface GateAnalytics {
  occupancyRate: number;
  averageTurnaroundTime: number;
  peakOccupancyHours: string[];
  mostUsedGates: string[];
  leastUsedGates: string[];
  maintenanceDowntime: number;
}

@Injectable({
  providedIn: 'root'
})
export class GateService {
  private gatesSubject = new BehaviorSubject<GateStatus[]>([]);
  private analyticsSubject = new BehaviorSubject<GateAnalytics>(this.generateInitialAnalytics());
  private gateHistorySubject = new BehaviorSubject<any[]>(this.generateGateHistory());
  
  // Simulation data
  private simulationData = {
    isRunning: true,
    speed: 1,
    lastUpdate: new Date()
  };

  constructor() {
    this.initializeGates();
    this.startSimulation();
  }

  // Public API Methods

  // Gate Operations
  getGates(): Observable<GateStatus[]> {
    return this.gatesSubject.asObservable().pipe(delay(200));
  }

  getGateById(gateId: string): Observable<GateStatus | null> {
    return this.gatesSubject.pipe(
      map(gates => gates.find(gate => gate.id === gateId) || null),
      delay(100)
    );
  }

  getGatesByTerminal(terminal: string): Observable<GateStatus[]> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => gate.terminal === terminal)),
      delay(100)
    );
  }

  getGatesByStatus(status: string): Observable<GateStatus[]> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => gate.status === status)),
      delay(100)
    );
  }

  // Gate Assignment
  updateGateAssignment(assignment: GateAssignment): Observable<GateStatus> {
    const gates = this.gatesSubject.value;
    const gateIndex = gates.findIndex(g => g.id === assignment.gateId);
    
    if (gateIndex === -1) {
      return throwError(() => new Error(`Gate ${assignment.gateId} not found`));
    }

    const updatedGate: GateStatus = {
      ...gates[gateIndex],
      status: assignment.status as any,
      currentFlight: assignment.flightNumber,
      nextFlight: assignment.nextFlightNumber,
      nextFlightTime: assignment.nextFlightTime
    };

    // Update flight status if assigned
    if (assignment.flightNumber) {
      this.updateFlightGateAssignment(assignment.flightNumber, updatedGate.gateNumber);
    }

    gates[gateIndex] = updatedGate;
    this.gatesSubject.next([...gates]);
    
    // Log gate assignment
    this.logGateHistory(updatedGate, 'assignment', assignment);

    return of(updatedGate).pipe(delay(300));
  }

  updateGateStatus(gateId: string, status: string): Observable<GateStatus> {
    const gates = this.gatesSubject.value;
    const gateIndex = gates.findIndex(g => g.id === gateId);
    
    if (gateIndex === -1) {
      return throwError(() => new Error(`Gate ${gateId} not found`));
    }

    const updatedGate: GateStatus = {
      ...gates[gateIndex],
      status: status as any
    };

    // If setting to Available, clear current flight
    if (status === 'Available') {
      updatedGate.currentFlight = undefined;
    }

    gates[gateIndex] = updatedGate;
    this.gatesSubject.next([...gates]);
    
    // Log status change
    this.logGateHistory(updatedGate, 'status_change', { oldStatus: gates[gateIndex].status, newStatus: status });

    return of(updatedGate).pipe(delay(200));
  }

  releaseGate(gateId: string): Observable<GateStatus> {
    const gates = this.gatesSubject.value;
    const gateIndex = gates.findIndex(g => g.id === gateId);
    
    if (gateIndex === -1) {
      return throwError(() => new Error(`Gate ${gateId} not found`));
    }

    const gate = gates[gateIndex];
    
    // Can only release occupied gates
    if (gate.status !== 'Occupied') {
      return throwError(() => new Error(`Gate ${gate.gateNumber} is not occupied`));
    }

    // Move current flight to next if exists
    const updatedGate: GateStatus = {
      ...gate,
      status: 'Available' as any,
      currentFlight: gate.nextFlight,
      nextFlight: undefined,
      nextFlightTime: gate.nextFlightTime
    };

    // Clear next flight time if no next flight
    if (!updatedGate.currentFlight) {
      updatedGate.nextFlightTime = undefined;
    }

    gates[gateIndex] = updatedGate;
    this.gatesSubject.next([...gates]);
    
    // Log gate release
    this.logGateHistory(updatedGate, 'release', { releasedFlight: gate.currentFlight });

    return of(updatedGate).pipe(delay(200));
  }

  swapGates(gate1Id: string, gate2Id: string): Observable<{gate1: GateStatus, gate2: GateStatus}> {
    const gates = this.gatesSubject.value;
    const gate1Index = gates.findIndex(g => g.id === gate1Id);
    const gate2Index = gates.findIndex(g => g.id === gate2Id);
    
    if (gate1Index === -1 || gate2Index === -1) {
      return throwError(() => new Error('One or both gates not found'));
    }

    const gate1 = gates[gate1Index];
    const gate2 = gates[gate2Index];

    // Swap flights
    const tempFlight = gate1.currentFlight;
    const tempNextFlight = gate1.nextFlight;
    const tempNextTime = gate1.nextFlightTime;

    const updatedGate1: GateStatus = {
      ...gate1,
      currentFlight: gate2.currentFlight,
      nextFlight: gate2.nextFlight,
      nextFlightTime: gate2.nextFlightTime
    };

    const updatedGate2: GateStatus = {
      ...gate2,
      currentFlight: tempFlight,
      nextFlight: tempNextFlight,
      nextFlightTime: tempNextTime
    };

    gates[gate1Index] = updatedGate1;
    gates[gate2Index] = updatedGate2;
    this.gatesSubject.next([...gates]);

    // Update flight gate assignments
    if (updatedGate1.currentFlight) {
      this.updateFlightGateAssignment(updatedGate1.currentFlight, updatedGate1.gateNumber);
    }
    if (updatedGate2.currentFlight) {
      this.updateFlightGateAssignment(updatedGate2.currentFlight, updatedGate2.gateNumber);
    }

    // Log gate swap
    this.logGateHistory(updatedGate1, 'swap', { swappedWith: gate2.gateNumber });
    this.logGateHistory(updatedGate2, 'swap', { swappedWith: gate1.gateNumber });

    return of({ gate1: updatedGate1, gate2: updatedGate2 }).pipe(delay(300));
  }

  // Analytics
  getGateAnalytics(): Observable<GateAnalytics> {
    return this.analyticsSubject.asObservable().pipe(delay(300));
  }

  getGateHistory(gateId?: string): Observable<any[]> {
    if (gateId) {
      return this.gateHistorySubject.pipe(
        map(history => history.filter(entry => entry.gateId === gateId)),
        delay(100)
      );
    }
    return this.gateHistorySubject.asObservable().pipe(delay(100));
  }

  getOccupancyTrend(hours: number = 24): Observable<{time: string, occupancy: number}[]> {
    return of(this.generateOccupancyTrend(hours)).pipe(delay(200));
  }

  // Simulation Controls
  setSimulationSpeed(speed: number): void {
    this.simulationData.speed = speed;
  }

  toggleSimulation(running: boolean): void {
    this.simulationData.isRunning = running;
  }

  // Private Methods

  private initializeGates(): void {
    const initialGates = this.generateInitialGates();
    this.gatesSubject.next(initialGates);
  }

  private generateInitialGates(): GateStatus[] {
    const gates: GateStatus[] = [];
    
    // Terminal 1 Gates (A1-A15)
    for (let i = 1; i <= 15; i++) {
      gates.push(this.createGate(`A${i}`, 'T1', i));
    }
    
    // Terminal 2 Gates (B1-B12)
    for (let i = 1; i <= 12; i++) {
      gates.push(this.createGate(`B${i}`, 'T2', i + 15));
    }
    
    // Terminal 3 Gates (C1-C18)
    for (let i = 1; i <= 18; i++) {
      gates.push(this.createGate(`C${i}`, 'T3', i + 27));
    }
    
    // Terminal 4 Gates (D1-D10)
    for (let i = 1; i <= 10; i++) {
      gates.push(this.createGate(`D${i}`, 'T4', i + 45));
    }

    return gates;
  }

  private createGate(gateNumber: string, terminal: string, index: number): GateStatus {
    const statuses: Array<GateStatus['status']> = ['Available', 'Occupied', 'Maintenance', 'Closed'];
    const status = statuses[index % statuses.length];
    
    const flights = ['DL123', 'AA456', 'UA789', 'B6123', 'WN456', 'AS789'];
    const airlines = ['Delta', 'American', 'United', 'JetBlue', 'Southwest', 'Alaska'];
    const destinations = ['LAX', 'ORD', 'DFW', 'ATL', 'MIA', 'SFO', 'SEA', 'BOS'];
    
    const currentFlight = status === 'Occupied' ? flights[index % flights.length] : undefined;
    const nextFlight = Math.random() > 0.3 ? flights[(index + 1) % flights.length] : undefined;
    
    const nextFlightTime = nextFlight ? new Date(Date.now() + (index * 30 + 60) * 60000) : undefined;

    return {
      id: `GATE-${gateNumber}`,
      gateNumber,
      terminal,
      status,
      currentFlight,
      airline: currentFlight ? airlines[index % airlines.length] : undefined,
      destination: currentFlight ? destinations[index % destinations.length] : undefined,
      nextFlight,
      nextFlightTime,
      lastUpdated: new Date(),
      turnaroundTime: status === 'Occupied' ? Math.floor(Math.random() * 60) + 30 : undefined
    };
  }

  private startSimulation(): void {
    // Simulate gate status changes
    setInterval(() => {
      if (!this.simulationData.isRunning) return;

      const gates = this.gatesSubject.value;
      const updatedGates = gates.map(gate => this.simulateGateUpdate(gate));
      
      this.gatesSubject.next(updatedGates);
      this.updateAnalytics();
      
      this.simulationData.lastUpdate = new Date();
    }, 5000); // Update every 5 seconds
  }

  private simulateGateUpdate(gate: GateStatus): GateStatus {
    if (gate.status === 'Maintenance' || gate.status === 'Closed') {
      // Maintenance/closed gates have a chance to become available
      if (Math.random() > 0.9) {
        return { ...gate, status: 'Available', currentFlight: undefined };
      }
      return gate;
    }

    if (gate.status === 'Occupied') {
      // Occupied gates have a chance to become available (flight departure)
      if (Math.random() > 0.85) {
        // Move next flight to current if exists
        const updatedGate: GateStatus = {
          ...gate,
          currentFlight: gate.nextFlight,
          nextFlight: undefined,
          nextFlightTime: undefined
        };

        if (!updatedGate.currentFlight) {
          updatedGate.status = 'Available';
        }

        return updatedGate;
      }
    } else if (gate.status === 'Available') {
      // Available gates have a chance to become occupied
      if (Math.random() > 0.7) {
        const flights = ['DL123', 'AA456', 'UA789', 'B6123', 'WN456', 'AS789'];
        const airlines = ['Delta', 'American', 'United', 'JetBlue', 'Southwest', 'Alaska'];
        const destinations = ['LAX', 'ORD', 'DFW', 'ATL', 'MIA', 'SFO', 'SEA', 'BOS'];
        
        const flightIndex = Math.floor(Math.random() * flights.length);
        
        return {
          ...gate,
          status: 'Occupied',
          currentFlight: flights[flightIndex],
          airline: airlines[flightIndex],
          destination: destinations[flightIndex % destinations.length],
          nextFlightTime: new Date(Date.now() + (Math.random() * 120 + 60) * 60000),
          turnaroundTime: Math.floor(Math.random() * 60) + 30
        };
      }
    }

    return gate;
  }

  private updateFlightGateAssignment(flightNumber: string, gateNumber: string): void {
    // In a real application, this would update the flight service
    console.log(`Flight ${flightNumber} assigned to Gate ${gateNumber}`);
  }

  private processBulkOperation(operation: BulkOperation): Observable<void> {
    const gates = this.gatesSubject.value;
    const updatedGates = [...gates];
    let changesMade = false;

    operation.gateIds.forEach(gateId => {
      const gateIndex = updatedGates.findIndex(g => g.id === gateId);
      if (gateIndex === -1) return;

      const gate = updatedGates[gateIndex];
      let updatedGate: GateStatus | null = null;

      switch (operation.operation) {
        case 'set_available':
          if (gate.status !== 'Available') {
            updatedGate = { ...gate, status: 'Available', currentFlight: undefined };
          }
          break;

        case 'set_maintenance':
          if (gate.status !== 'Maintenance') {
            updatedGate = { ...gate, status: 'Maintenance', currentFlight: undefined, nextFlight: undefined };
          }
          break;

        case 'set_closed':
          if (gate.status !== 'Closed') {
            updatedGate = { ...gate, status: 'Closed', currentFlight: undefined, nextFlight: undefined };
          }
          break;

        case 'release_all':
          if (gate.status === 'Occupied') {
            updatedGate = { 
              ...gate, 
              status: 'Available', 
              currentFlight: undefined,
              nextFlight: undefined,
              nextFlightTime: undefined
            };
          }
          break;

        case 'schedule_maintenance':
          const duration = operation.parameters?.duration || 60;
          const reason = operation.parameters?.reason || 'Scheduled Maintenance';
          updatedGate = { 
            ...gate, 
            status: 'Maintenance', 
            currentFlight: undefined,
            nextFlight: undefined,
            maintenanceScheduled: true,
            maintenanceDuration: duration,
            maintenanceReason: reason
          };
          break;
      }

      if (updatedGate) {
        updatedGates[gateIndex] = updatedGate;
        changesMade = true;
        
        // Log bulk operation
        this.logGateHistory(updatedGate, 'bulk_operation', {
          operation: operation.operation,
          parameters: operation.parameters
        });
      }
    });

    if (changesMade) {
      this.gatesSubject.next(updatedGates);
    }

    return of(undefined).pipe(
      delay(500),
      tap(() => {
        if (changesMade) {
          console.log(`Bulk operation '${operation.operation}' completed on ${operation.gateIds.length} gates`);
        }
      })
    );
  }

  performBulkOperation(operation: string, gates: GateStatus[]): Observable<void> {
    const gateIds = gates.map(gate => gate.id);
    const bulkOperation: BulkOperation = {
      operation,
      gateIds,
      parameters: this.getBulkOperationParameters(operation)
    };
  
    return this.processBulkOperation(bulkOperation);
  }
  
  private getBulkOperationParameters(operation: string): any {
    switch (operation) {
      case 'status_change':
        return { newStatus: 'Maintenance' }; // Default
      case 'schedule_maintenance':
        return {
          duration: 60,
          reason: 'Scheduled Maintenance'
        };
      case 'release_flights':
        return { releaseAll: true };
      case 'clear_gates':
        return { clearAll: true };
      default:
        return {};
    }
  }

  private updateAnalytics(): void {
    const gates = this.gatesSubject.value;
    const analytics = this.calculateAnalytics(gates);
    this.analyticsSubject.next(analytics);
  }

  private calculateAnalytics(gates: GateStatus[]): GateAnalytics {
    const totalGates = gates.length;
    const occupiedGates = gates.filter(g => g.status === 'Occupied').length;
    const maintenanceGates = gates.filter(g => g.status === 'Maintenance').length;
    
    // Calculate occupancy rate
    const occupancyRate = totalGates > 0 ? (occupiedGates / totalGates) * 100 : 0;
    
    // Calculate average turnaround time
    const occupiedGatesWithTime = gates.filter(g => g.turnaroundTime);
    const averageTurnaroundTime = occupiedGatesWithTime.length > 0
      ? occupiedGatesWithTime.reduce((sum, gate) => sum + (gate.turnaroundTime || 0), 0) / occupiedGatesWithTime.length
      : 0;
    
    // Find most and least used gates (simplified)
    const gateUsage = gates
      .filter(g => g.status === 'Occupied')
      .map(g => ({ gate: g.gateNumber, usage: Math.random() * 100 }))
      .sort((a, b) => b.usage - a.usage);
    
    const mostUsedGates = gateUsage.slice(0, 3).map(g => g.gate);
    const leastUsedGates = gateUsage.slice(-3).map(g => g.gate);
    
    // Peak hours (simulated)
    const peakOccupancyHours = ['08:00', '12:00', '17:00'];
    
    // Maintenance downtime (simulated)
    const maintenanceDowntime = maintenanceGates * 60; // minutes

    return {
      occupancyRate: Math.round(occupancyRate),
      averageTurnaroundTime: Math.round(averageTurnaroundTime),
      peakOccupancyHours,
      mostUsedGates,
      leastUsedGates,
      maintenanceDowntime
    };
  }

  private generateInitialAnalytics(): GateAnalytics {
    return {
      occupancyRate: 65,
      averageTurnaroundTime: 45,
      peakOccupancyHours: ['08:00', '12:00', '17:00'],
      mostUsedGates: ['A12', 'B5', 'C8'],
      leastUsedGates: ['A1', 'D10', 'C18'],
      maintenanceDowntime: 120
    };
  }

  private generateOccupancyTrend(hours: number): {time: string, occupancy: number}[] {
    const trend = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - (hours - i - 1) * 60 * 60 * 1000);
      const hour = time.getHours().toString().padStart(2, '0');
      const minute = time.getMinutes().toString().padStart(2, '0');
      
      // Simulate occupancy pattern (higher during day, lower at night)
      let baseOccupancy = 40;
      if (time.getHours() >= 6 && time.getHours() <= 9) baseOccupancy = 70; // Morning peak
      if (time.getHours() >= 16 && time.getHours() <= 19) baseOccupancy = 80; // Evening peak
      if (time.getHours() >= 22 || time.getHours() <= 4) baseOccupancy = 20; // Night
      
      const occupancy = baseOccupancy + (Math.random() * 20 - 10); // Add some variation
      
      trend.push({
        time: `${hour}:${minute}`,
        occupancy: Math.round(Math.max(0, Math.min(100, occupancy)))
      });
    }
    
    return trend;
  }

  private generateGateHistory(): any[] {
    const history = [];
    const actions = ['assignment', 'release', 'status_change', 'maintenance'];
    const gates = this.generateInitialGates();
    
    for (let i = 0; i < 50; i++) {
      const gate = gates[Math.floor(Math.random() * gates.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      history.push({
        gateId: gate.id,
        gateNumber: gate.gateNumber,
        terminal: gate.terminal,
        action: action,
        timestamp: timestamp,
        details: this.generateHistoryDetails(action, gate),
        user: this.generateRandomUser()
      });
    }
    
    // Sort by timestamp (newest first)
    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private generateHistoryDetails(action: string, gate: GateStatus): any {
    switch (action) {
      case 'assignment':
        return {
          flightAssigned: gate.currentFlight || 'DL123',
          previousFlight: null,
          assignedBy: 'System Auto-assign'
        };
      case 'release':
        return {
          flightReleased: gate.currentFlight || 'DL123',
          gateStatus: 'Available',
          releasedBy: 'Gate Agent'
        };
      case 'status_change':
        return {
          previousStatus: 'Available',
          newStatus: gate.status,
          reason: 'Operational requirement'
        };
      case 'maintenance':
        return {
          reason: 'Routine maintenance',
          duration: '60 minutes',
          technician: 'Maintenance Team'
        };
      default:
        return {};
    }
  }

  private generateRandomUser(): string {
    const users = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Sarah Williams', 'Michael Brown'];
    return users[Math.floor(Math.random() * users.length)];
  }

  private logGateHistory(gate: GateStatus, action: string, details: any): void {
    const historyEntry = {
      gateId: gate.id,
      gateNumber: gate.gateNumber,
      terminal: gate.terminal,
      action: action,
      timestamp: new Date(),
      details: details,
      user: 'Current User' // In a real app, this would be the logged-in user
    };

    const currentHistory = this.gateHistorySubject.value;
    const newHistory = [historyEntry, ...currentHistory.slice(0, 99)]; // Keep last 100 entries
    this.gateHistorySubject.next(newHistory);
  }

  // Additional Utility Methods

  getAvailableGatesCount(): Observable<number> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => gate.status === 'Available').length)
    );
  }

  getOccupiedGatesCount(): Observable<number> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => gate.status === 'Occupied').length)
    );
  }

  getMaintenanceGatesCount(): Observable<number> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => gate.status === 'Maintenance').length)
    );
  }

  findGateByFlight(flightNumber: string): Observable<GateStatus | null> {
    return this.gatesSubject.pipe(
      map(gates => gates.find(gate => 
        gate.currentFlight === flightNumber || gate.nextFlight === flightNumber
      ) || null),
      delay(100)
    );
  }

  getGatesNeedingAttention(): Observable<GateStatus[]> {
    return this.gatesSubject.pipe(
      map(gates => gates.filter(gate => {
        // Gates that need attention:
        // 1. Long turnaround times (> 60 minutes)
        // 2. Maintenance gates that have been down for too long
        // 3. Gates with delayed next flights
        const longTurnaround = gate.status === 'Occupied' && gate.turnaroundTime && gate.turnaroundTime > 60;
        const maintenanceTooLong = gate.status === 'Maintenance' && gate.maintenanceDuration && gate.maintenanceDuration > 120;
        const delayedNextFlight = gate.nextFlightTime && gate.nextFlightTime < new Date();
        
        return longTurnaround || maintenanceTooLong || delayedNextFlight;
      })),
      delay(200)
    );
  }

  // Batch Operations
  batchUpdateGateStatus(gateIds: string[], status: string): Observable<GateStatus[]> {
    const gates = this.gatesSubject.value;
    const updatedGates = gates.map(gate => {
      if (gateIds.includes(gate.id)) {
        return { ...gate, status: status as any };
      }
      return gate;
    });

    this.gatesSubject.next(updatedGates);
    
    // Log batch update
    gateIds.forEach(gateId => {
      const gate = updatedGates.find(g => g.id === gateId);
      if (gate) {
        this.logGateHistory(gate, 'batch_status_change', { newStatus: status });
      }
    });

    return of(updatedGates.filter(gate => gateIds.includes(gate.id))).pipe(delay(300));
  }

  // Gate Performance
  getGatePerformance(gateId: string, period: 'day' | 'week' | 'month' = 'day'): Observable<any> {
    // Simulate performance data
    const performance = {
      gateId,
      period,
      utilization: Math.random() * 100,
      averageTurnaroundTime: Math.random() * 60 + 30,
      flightsHandled: Math.floor(Math.random() * 20) + 5,
      delays: Math.floor(Math.random() * 5),
      onTimePerformance: Math.random() * 100
    };

    return of(performance).pipe(delay(200));
  }

  // Predictive Analytics
  predictGateOccupancy(hoursAhead: number): Observable<{gateId: string, probability: number}[]> {
    return this.gatesSubject.pipe(
      map(gates => {
        return gates.map(gate => {
          // Simple prediction algorithm based on current status and time
          let probability = 0.5;
          
          if (gate.status === 'Occupied') {
            probability = 0.8; // Likely to stay occupied
          } else if (gate.status === 'Available') {
            probability = 0.3; // Might become occupied
          } else if (gate.status === 'Maintenance') {
            probability = 0.1; // Unlikely to become occupied
          }
          
          // Adjust based on time of day (higher probability during peak hours)
          const hour = new Date().getHours();
          if ((hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19)) {
            probability += 0.2;
          }
          
          return {
            gateId: gate.id,
            probability: Math.min(1, Math.max(0, probability))
          };
        });
      }),
      delay(300)
    );
  }

  // Error Handling
  handleError(error: any): Observable<never> {
    console.error('Gate Service Error:', error);
    return throwError(() => new Error(error.message || 'An error occurred in Gate Service'));
  }
}