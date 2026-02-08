import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { AirportMetrics, FlightStatus, GateStatus, TerminalStatus, Resource, Alert, WeatherData, PassengerFlow } from '../models/airport-models';

@Injectable({
  providedIn: 'root'
})
export class AirportDataService {
  private metricsSubject = new BehaviorSubject<AirportMetrics>(this.generateInitialMetrics());
  private flightsSubject = new BehaviorSubject<FlightStatus[]>(this.generateFlights());
  private gatesSubject = new BehaviorSubject<GateStatus[]>(this.generateGates());
  private resourcesSubject = new BehaviorSubject<Resource[]>(this.generateResources());
  
  getAirportMetrics(): Observable<AirportMetrics> {
    return this.metricsSubject.asObservable().pipe(delay(500));
  }
  
  getFlightStatus(): Observable<FlightStatus[]> {
    return this.flightsSubject.asObservable().pipe(delay(300));
  }
  
  getGateStatus(): Observable<GateStatus[]> {
    return this.gatesSubject.asObservable().pipe(delay(300));
  }
  
  getTerminalStatus(): Observable<TerminalStatus[]> {
    return of(this.generateTerminalStatus()).pipe(delay(300));
  }
  
  getResources(): Observable<Resource[]> {
    return this.resourcesSubject.asObservable().pipe(delay(300));
  }
  
  refreshMetrics(): Observable<AirportMetrics> {
    const updatedMetrics = this.generateUpdatedMetrics(this.metricsSubject.value);
    this.metricsSubject.next(updatedMetrics);
    return of(updatedMetrics).pipe(delay(200));
  }
  
  updateGateStatus(gateId: string, status: Partial<GateStatus>): Observable<GateStatus> {
    const gates = this.gatesSubject.value;
    const gateIndex = gates.findIndex(g => g.id === gateId);
    
    if (gateIndex > -1) {
      gates[gateIndex] = { ...gates[gateIndex], ...status };
      this.gatesSubject.next([...gates]);
      return of(gates[gateIndex]).pipe(delay(200));
    }
    
    throw new Error(`Gate ${gateId} not found`);
  }
  
  // Data generation methods
  private generateInitialMetrics(): AirportMetrics {
    return {
      totalFlights: 156,
      activeFlights: 42,
      delayedFlights: 8,
      passengerCount: 12500,
      securityWaitTime: 15,
      baggageWaitTime: 8,
      gateOccupancy: 78,
      weatherCondition: 'Clear'
    };
  }
  
  private generateUpdatedMetrics(current: AirportMetrics): AirportMetrics {
    return {
      ...current,
      passengerCount: Math.max(5000, current.passengerCount + Math.floor(Math.random() * 200 - 100)),
      delayedFlights: Math.max(0, current.delayedFlights + Math.floor(Math.random() * 3 - 1)),
      securityWaitTime: Math.max(5, current.securityWaitTime + Math.floor(Math.random() * 3 - 1)),
      gateOccupancy: Math.min(100, Math.max(0, current.gateOccupancy + Math.floor(Math.random() * 5 - 2)))
    };
  }
  
  private generateFlights(): FlightStatus[] {
    const flights: FlightStatus[] = [];
    const airlines = ['Delta', 'American', 'United', 'JetBlue', 'Southwest'];
    const destinations = ['LAX', 'ORD', 'DFW', 'ATL', 'MIA', 'SFO', 'SEA', 'BOS'];
    const statuses: Array<FlightStatus['status']> = ['On Time', 'Delayed', 'Boarding', 'Departed', 'Arrived'];
    
    for (let i = 0; i < 20; i++) {
      const time = new Date();
      time.setHours(time.getHours() + Math.floor(Math.random() * 6));
      
      flights.push({
        id: `FL${1000 + i}`,
        flightNumber: `${airlines[0].substring(0, 2).toUpperCase()}${100 + i}`,
        airline: airlines[i % airlines.length],
        destination: destinations[i % destinations.length],
        scheduledTime: time,
        estimatedTime: new Date(time.getTime() + (Math.random() > 0.7 ? 30 * 60000 : 0)),
        status: statuses[i % statuses.length],
        gate: `A${i % 15}`,
        terminal: 'T' + (i % 4 + 1),
        delayMinutes: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : undefined
      });
    }
    
    return flights;
  }
  
  private generateGates(): GateStatus[] {
    const gates: GateStatus[] = [];
    const statuses: Array<GateStatus['status']> = ['Available', 'Occupied', 'Maintenance', 'Closed'];
    
    for (let i = 1; i <= 40; i++) {
      const terminal = i <= 10 ? 'T1' : i <= 20 ? 'T2' : i <= 30 ? 'T3' : 'T4';
      const gateNumber = `${terminal.charAt(1)}${i % 10 || 10}`;
      
      gates.push({
        id: `GATE${gateNumber}`,
        gateNumber,
        terminal,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        currentFlight: Math.random() > 0.3 ? `DL${100 + i}` : undefined,
        nextFlight: Math.random() > 0.5 ? `AA${200 + i}` : undefined,
        nextFlightTime: new Date(Date.now() + (i * 30 * 60000))
      });
    }
    
    return gates;
  }
  
  private generateTerminalStatus(): TerminalStatus[] {
    return [
      {
        id: 'T1',
        terminal: 'Terminal 1',
        passengerCount: 3200,
        securityWaitTime: 18,
        checkinWaitTime: 12,
        baggageWaitTime: 10,
        crowdedness: 'High'
      },
      {
        id: 'T2',
        terminal: 'Terminal 2',
        passengerCount: 2800,
        securityWaitTime: 12,
        checkinWaitTime: 8,
        baggageWaitTime: 6,
        crowdedness: 'Medium'
      },
      {
        id: 'T3',
        terminal: 'Terminal 3',
        passengerCount: 4100,
        securityWaitTime: 25,
        checkinWaitTime: 15,
        baggageWaitTime: 12,
        crowdedness: 'Critical'
      },
      {
        id: 'T4',
        terminal: 'Terminal 4',
        passengerCount: 2400,
        securityWaitTime: 10,
        checkinWaitTime: 6,
        baggageWaitTime: 5,
        crowdedness: 'Low'
      }
    ];
  }
  
  private generateResources(): Resource[] {
    const resources: Resource[] = [];
    const types: Resource['type'][] = ['Staff', 'Equipment', 'Vehicle'];
    const locations = ['T1 Security', 'T2 Check-in', 'T3 Baggage', 'T4 Gates', 'Runway A', 'Runway B'];
    const statuses: Resource['status'][] = ['Available', 'In Use', 'Maintenance'];
    
    for (let i = 1; i <= 50; i++) {
      const type = types[i % types.length];
      
      resources.push({
        id: `RES${1000 + i}`,
        type,
        name: `${type} ${i}`,
        location: locations[i % locations.length],
        status: statuses[i % statuses.length],
        assignedTask: Math.random() > 0.5 ? `Task ${i}` : undefined
      });
    }
    
    return resources;
  }
}