import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError, timer } from 'rxjs';
import { catchError, map, tap, delay, switchMap } from 'rxjs/operators';
import { Flight, FlightStatus, OperationType, FlightFilter, AircraftType } from '../models/flight.interface';

export interface RealTimeFlightData {
  flight: Flight;
  timestamp: Date;
  position?: {
    latitude: number;
    longitude: number;
    altitude: number;
    heading: number;
    speed: number;
  };
  gateOccupied?: boolean;
  fuelStatus?: number; // percentage
  crewOnboard?: boolean;
  lastUpdate?: string;
}

export interface FlightStatistics {
  totalFlights: number;
  byStatus: Record<FlightStatus, number>;
  byOperationType: Record<OperationType, number>;
  byTerminal: Record<string, number>;
  averageDelay: number;
  peakHours: Array<{ hour: number; flightCount: number }>;
  cancellationsToday: number;
  delayedPercentage: number;
  onTimePercentage: number;
}

export interface FlightDelayPrediction {
  flightNumber: string;
  predictedDelay: number; // minutes
  confidence: number; // 0-1
  factors: string[];
  suggestedActions: string[];
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FlightUpdateRequest {
  flightId: string;
  updates: Partial<Flight>;
  reason?: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FlightService {
  private apiUrl = 'api/flights'; // Base API URL
  private websocketUrl = 'ws://localhost:3000/flights/updates'; // WebSocket URL
  
  private flightsSubject = new BehaviorSubject<Flight[]>([]);
  private realTimeUpdatesSubject = new BehaviorSubject<RealTimeFlightData[]>([]);
  private selectedFlightSubject = new BehaviorSubject<Flight | null>(null);
  private statisticsSubject = new BehaviorSubject<FlightStatistics | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  flights$ = this.flightsSubject.asObservable();
  realTimeUpdates$ = this.realTimeUpdatesSubject.asObservable();
  selectedFlight$ = this.selectedFlightSubject.asObservable();
  statistics$ = this.statisticsSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  
  // Mock data for development/demo
  private mockFlights: Flight[] = [];
  private mockAirlines = [
    { name: 'Delta Air Lines', code: 'DL', logo: 'assets/airline-logos/delta.png' },
    { name: 'American Airlines', code: 'AA', logo: 'assets/airline-logos/american.png' },
    { name: 'United Airlines', code: 'UA', logo: 'assets/airline-logos/united.png' },
    { name: 'Southwest Airlines', code: 'WN', logo: 'assets/airline-logos/southwest.png' },
    { name: 'JetBlue', code: 'B6', logo: 'assets/airline-logos/jetblue.png' },
    { name: 'Alaska Airlines', code: 'AS', logo: 'assets/airline-logos/alaska.png' },
    { name: 'Spirit Airlines', code: 'NK', logo: 'assets/airline-logos/spirit.png' },
    { name: 'Frontier Airlines', code: 'F9', logo: 'assets/airline-logos/frontier.png' },
    { name: 'British Airways', code: 'BA', logo: 'assets/airline-logos/british-airways.png' },
    { name: 'Lufthansa', code: 'LH', logo: 'assets/airline-logos/lufthansa.png' },
    { name: 'Air France', code: 'AF', logo: 'assets/airline-logos/airfrance.png' },
    { name: 'Emirates', code: 'EK', logo: 'assets/airline-logos/emirates.png' },
    { name: 'Qatar Airways', code: 'QR', logo: 'assets/airline-logos/qatar.png' },
    { name: 'Singapore Airlines', code: 'SQ', logo: 'assets/airline-logos/singapore.png' },
    { name: 'Cathay Pacific', code: 'CX', logo: 'assets/airline-logos/cathay.png' },
    { name: 'ANA', code: 'NH', logo: 'assets/airline-logos/ana.png' },
    { name: 'Qantas', code: 'QF', logo: 'assets/airline-logos/qantas.png' }
  ];
  
  private mockAirports = [
    'JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'SFO', 'SEA', 'MIA', 'BOS',
    'LHR', 'CDG', 'FRA', 'AMS', 'DXB', 'HND', 'SIN', 'ICN', 'SYD', 'YYZ'
  ];
  
  private aircraftTypes = [
    'B737', 'B747', 'B777', 'B787', 'A320', 'A330', 'A350', 'A380',
    'CRJ900', 'ERJ175', 'E195', 'ATR72'
  ];
  
  private statuses: FlightStatus[] = [
    'SCHEDULED', 'ON_TIME', 'DELAYED', 'BOARDING', 'IN_FLIGHT', 'LANDED', 'CANCELLED'
  ];
  
  private terminals = ['T1', 'T2', 'T3', 'T4', 'T5'];
  private gates = Array.from({ length: 50 }, (_, i) => `G${(i + 1).toString().padStart(2, '0')}`);
  
  constructor(private http: HttpClient) {
    this.generateMockFlights(100); // Generate 100 mock flights
    this.startRealTimeSimulation();
    this.startStatisticsUpdates();
  }

  /**
   * Generate mock flights for development
   */
  private generateMockFlights(count: number = 100): void {
    this.mockFlights = [];
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const airline = this.mockAirlines[Math.floor(Math.random() * this.mockAirlines.length)];
      const operationType: OperationType = Math.random() > 0.5 ? 'DEPARTURE' : 'ARRIVAL';
      const origin = this.mockAirports[Math.floor(Math.random() * this.mockAirports.length)];
      let destination: string;
      
      do {
        destination = this.mockAirports[Math.floor(Math.random() * this.mockAirports.length)];
      } while (destination === origin);
      
      // Generate scheduled time within next 24 hours
      const scheduledTime = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      
      // Determine status based on time
      let status: FlightStatus;
      const timeDiff = scheduledTime.getTime() - now.getTime();
      
      if (timeDiff > 3 * 60 * 60 * 1000) {
        status = 'SCHEDULED';
      } else if (timeDiff > 60 * 60 * 1000) {
        status = Math.random() > 0.3 ? 'SCHEDULED' : 'BOARDING';
      } else if (timeDiff > 0) {
        status = Math.random() > 0.2 ? 'BOARDING' : 'DELAYED';
      } else {
        status = Math.random() > 0.7 ? 'IN_FLIGHT' : 'LANDED';
      }
      
      // Add some cancellations
      if (Math.random() > 0.95) {
        status = 'CANCELLED';
      }
      
      // Add some on-time flights
      if (status === 'SCHEDULED' && Math.random() > 0.8) {
        status = 'ON_TIME';
      }
      
      const flight: Flight = {
        id: `FL${(i + 1).toString().padStart(4, '0')}`,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000 + 1000)}`,
        airline: airline.name,
        airlineLogo: airline.logo,
        operationType,
        origin: operationType === 'DEPARTURE' ? 'JFK' : origin,
        destination: operationType === 'ARRIVAL' ? 'JFK' : destination,
        scheduledTime: scheduledTime.toISOString(),
        actualTime: this.generateActualTime(status, scheduledTime),
        status,
        gate: Math.random() > 0.2 ? this.gates[Math.floor(Math.random() * this.gates.length)] : undefined,
        terminal: Math.random() > 0.1 ? this.terminals[Math.floor(Math.random() * this.terminals.length)] : undefined,
        baggageClaim: operationType === 'ARRIVAL' ? `BC${Math.floor(Math.random() * 10) + 1}` : undefined,
        aircraftType: this.aircraftTypes[Math.floor(Math.random() * this.aircraftTypes.length)] as AircraftType,
        estimatedTime: this.generateEstimatedTime(status, scheduledTime),
        delayMinutes: status === 'DELAYED' ? Math.floor(Math.random() * 120) + 15 : 0,
        checkInCounters: operationType === 'DEPARTURE' ? 
          [`C${Math.floor(Math.random() * 30) + 1}`, `C${Math.floor(Math.random() * 30) + 1}`] : undefined,
        remarks: this.generateRemarks(status),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.mockFlights.push(flight);
    }
    
    // Sort by scheduled time
    this.mockFlights.sort((a, b) => 
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  private generateActualTime(status: FlightStatus, scheduledTime: Date): string | undefined {
    const scheduled = new Date(scheduledTime);
    
    switch (status) {
      case 'DELAYED':
        return new Date(scheduled.getTime() + (Math.random() * 120 + 15) * 60 * 1000).toISOString();
      case 'ON_TIME':
        return scheduled.toISOString();
      case 'LANDED':
        return new Date(scheduled.getTime() - Math.random() * 60 * 60 * 1000).toISOString();
      case 'IN_FLIGHT':
        return new Date(scheduled.getTime() - Math.random() * 30 * 60 * 1000).toISOString();
      default:
        return undefined;
    }
  }

  private generateEstimatedTime(status: FlightStatus, scheduledTime: Date): string | undefined {
    if (status === 'DELAYED') {
      const scheduled = new Date(scheduledTime);
      return new Date(scheduled.getTime() + (Math.random() * 120 + 15) * 60 * 1000).toISOString();
    }
    return undefined;
  }

  private generateRemarks(status: FlightStatus): string | undefined {
    // Create a complete record with all FlightStatus keys
    const allRemarks: Record<FlightStatus, string[]> = {
      'SCHEDULED': ['Scheduled', 'Check-in open', 'Gate to be assigned'],
      'ON_TIME': ['On time', 'Boarding on schedule', 'Gate ready'],
      'DELAYED': ['Weather delay', 'Late inbound aircraft', 'Air traffic control', 'Technical issue', 'Crew delay'],
      'BOARDING': ['Final call', 'Boarding completed', 'Gate closing', 'Last call for boarding'],
      'IN_FLIGHT': ['Enroute', 'On schedule', 'Minor turbulence', 'Good weather conditions'],
      'LANDED': ['Arrived', 'At gate', 'Baggage unloading', 'Cleared immigration'],
      'CANCELLED': ['Operational reasons', 'Weather conditions', 'Aircraft maintenance', 'Crew availability']
    };
  
    const remarks = allRemarks[status];
    if (remarks && remarks.length > 0) {
      return remarks[Math.floor(Math.random() * remarks.length)];
    }
    
    return undefined;
  }

  private filterMockFlights(filter?: FlightFilter): Flight[] {
    let filtered = [...this.mockFlights];
    const now = new Date();
    
    // Filter by time period
    if (filter?.timePeriod) {
      const endTime = new Date(now.getTime() + filter.timePeriod * 60 * 1000);
      filtered = filtered.filter(flight => {
        const flightTime = new Date(flight.scheduledTime);
        return flightTime >= now && flightTime <= endTime;
      });
    }
    
    // Filter by status
    if (filter?.status && filter.status !== 'ALL') {
      filtered = filtered.filter(flight => flight.status === filter.status);
    }
    
    // Filter by operation type
    if (filter?.operationType && filter.operationType !== 'ALL') {
      filtered = filtered.filter(flight => flight.operationType === filter.operationType);
    }
    
    // Filter by terminal
    if (filter?.terminal && filter.terminal !== 'ALL') {
      filtered = filtered.filter(flight => flight.terminal === filter.terminal);
    }
    
    // Filter only delays
    if (filter?.showOnlyDelays) {
      filtered = filtered.filter(flight => flight.status === 'DELAYED');
    }
    
    // Filter by search query
    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(flight => 
        flight.flightNumber.toLowerCase().includes(query) ||
        flight.airline.toLowerCase().includes(query) ||
        flight.destination.toLowerCase().includes(query) ||
        flight.origin.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }

  /**
   * Start real-time simulation
   */
  private startRealTimeSimulation(): void {
    // Simulate real-time updates every 10 seconds
    timer(0, 10000).subscribe(() => {
      this.updateFlightStatuses();
    });
  }

  /**
   * Start statistics updates
   */
  private startStatisticsUpdates(): void {
    // Update statistics every 30 seconds
    timer(0, 30000).subscribe(() => {
      this.updateStatistics();
    });
  }

  private updateFlightStatuses(): void {
    const now = new Date();
    const updatedFlights = [...this.mockFlights];
    let changed = false;
    
    updatedFlights.forEach(flight => {
      const scheduledTime = new Date(flight.scheduledTime);
      const timeDiff = scheduledTime.getTime() - now.getTime();
      
      // Update status based on time
      if (flight.status === 'SCHEDULED' && timeDiff < 60 * 60 * 1000 && timeDiff > 0) {
        flight.status = 'BOARDING';
        changed = true;
      } else if (flight.status === 'BOARDING' && timeDiff < 0) {
        flight.status = Math.random() > 0.3 ? 'IN_FLIGHT' : 'DELAYED';
        changed = true;
      } else if (flight.status === 'IN_FLIGHT' && timeDiff < -60 * 60 * 1000) {
        flight.status = 'LANDED';
        changed = true;
      }
      
      // Randomly add/remove delays
      if (flight.status === 'SCHEDULED' && Math.random() > 0.95) {
        flight.status = 'DELAYED';
        flight.delayMinutes = Math.floor(Math.random() * 120) + 15;
        flight.remarks = 'Weather delay';
        changed = true;
      }
    });
    
    if (changed) {
      this.mockFlights = updatedFlights;
      this.flightsSubject.next(this.mockFlights);
    }
  }

  private updateStatistics(): void {
    this.getFlightStatistics().subscribe();
  }

  /**
   * Get flights with optional filters
   */
  getFlights(filter?: FlightFilter): Observable<Flight[]> {
    this.loadingSubject.next(true);
    
    let params = new HttpParams();
    
    if (filter?.viewMode) {
      params = params.set('viewMode', filter.viewMode);
    }
    
    if (filter?.timePeriod) {
      params = params.set('timePeriod', filter.timePeriod.toString());
    }
    
    if (filter?.status && filter.status !== 'ALL') {
      params = params.set('status', filter.status);
    }
    
    if (filter?.operationType && filter.operationType !== 'ALL') {
      params = params.set('operationType', filter.operationType);
    }
    
    if (filter?.terminal && filter.terminal !== 'ALL') {
      params = params.set('terminal', filter.terminal);
    }
    
    if (filter?.showOnlyDelays) {
      params = params.set('showOnlyDelays', 'true');
    }
    
    if (filter?.searchQuery) {
      params = params.set('search', filter.searchQuery);
    }
    
    // For production, use HTTP request
    // return this.http.get<Flight[]>(this.apiUrl, { params }).pipe(
    //   tap(flights => {
    //     this.flightsSubject.next(flights);
    //     this.loadingSubject.next(false);
    //   }),
    //   catchError(this.handleError)
    // );
    
    // For demo, filter mock data
    return of(this.filterMockFlights(filter)).pipe(
      delay(300), // Simulate network delay
      tap(flights => {
        this.flightsSubject.next(flights);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get a single flight by ID
   */
  getFlightById(flightId: string): Observable<Flight> {
    this.loadingSubject.next(true);
    
    // return this.http.get<Flight>(`${this.apiUrl}/${flightId}`).pipe(
    //   tap(() => this.loadingSubject.next(false)),
    //   catchError(this.handleError)
    // );
    
    const flight = this.mockFlights.find(f => f.id === flightId);
    if (flight) {
      return of(flight).pipe(
        delay(200),
        tap(() => this.loadingSubject.next(false))
      );
    }
    
    this.loadingSubject.next(false);
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Set selected flight
   */
  setSelectedFlight(flight: Flight | null): void {
    this.selectedFlightSubject.next(flight);
  }

  /**
   * Get flights by flight number
   */
  getFlightsByNumber(flightNumber: string): Observable<Flight[]> {
    const flights = this.mockFlights.filter(f => 
      f.flightNumber.toLowerCase().includes(flightNumber.toLowerCase())
    );
    return of(flights).pipe(delay(200));
  }

  /**
   * Get flights for a specific gate
   */
  getFlightsByGate(gate: string): Observable<Flight[]> {
    const flights = this.mockFlights.filter(f => f.gate === gate);
    return of(flights).pipe(delay(200));
  }

  /**
   * Get flights for a specific terminal
   */
  getFlightsByTerminal(terminal: string): Observable<Flight[]> {
    const flights = this.mockFlights.filter(f => f.terminal === terminal);
    return of(flights).pipe(delay(200));
  }

  /**
   * Get upcoming flights within time range
   */
  getUpcomingFlights(hours: number = 3): Observable<Flight[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    const flights = this.mockFlights.filter(flight => {
      const scheduledTime = new Date(flight.scheduledTime);
      return scheduledTime >= now && scheduledTime <= endTime;
    });
    
    return of(flights).pipe(delay(200));
  }

  /**
   * Get delayed flights
   */
  getDelayedFlights(minDelayMinutes: number = 15): Observable<Flight[]> {
    const flights = this.mockFlights.filter(flight => {
      if (flight.status !== 'DELAYED') return false;
      if (!flight.actualTime || !flight.scheduledTime) return false;
      
      const scheduled = new Date(flight.scheduledTime).getTime();
      const actual = new Date(flight.actualTime).getTime();
      const delay = (actual - scheduled) / (1000 * 60);
      
      return delay >= minDelayMinutes;
    });
    
    return of(flights).pipe(delay(200));
  }

  /**
   * Update flight status
   */
  updateFlightStatus(flightId: string, status: FlightStatus, reason?: string): Observable<Flight> {
    // return this.http.patch<Flight>(`${this.apiUrl}/${flightId}/status`, { status, reason }).pipe(
    //   catchError(this.handleError)
    // );
    
    const flightIndex = this.mockFlights.findIndex(f => f.id === flightId);
    if (flightIndex !== -1) {
      this.mockFlights[flightIndex].status = status;
      this.mockFlights[flightIndex].actualTime = new Date().toISOString();
      if (reason) {
        this.mockFlights[flightIndex].remarks = reason;
      }
      this.flightsSubject.next([...this.mockFlights]);
      return of(this.mockFlights[flightIndex]).pipe(delay(300));
    }
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Update flight gate assignment
   */
  updateFlightGate(flightId: string, gate: string): Observable<Flight> {
    // return this.http.patch<Flight>(`${this.apiUrl}/${flightId}/gate`, { gate }).pipe(
    //   catchError(this.handleError)
    // );
    
    const flightIndex = this.mockFlights.findIndex(f => f.id === flightId);
    if (flightIndex !== -1) {
      this.mockFlights[flightIndex].gate = gate;
      this.flightsSubject.next([...this.mockFlights]);
      return of(this.mockFlights[flightIndex]).pipe(delay(300));
    }
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Update flight delay
   */
  updateFlightDelay(flightId: string, delayMinutes: number, reason?: string): Observable<Flight> {
    const flightIndex = this.mockFlights.findIndex(f => f.id === flightId);
    if (flightIndex !== -1) {
      const flight = this.mockFlights[flightIndex];
      const scheduledTime = new Date(flight.scheduledTime);
      const newActualTime = new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000);
      
      this.mockFlights[flightIndex].status = 'DELAYED';
      this.mockFlights[flightIndex].actualTime = newActualTime.toISOString();
      this.mockFlights[flightIndex].delayMinutes = delayMinutes;
      this.mockFlights[flightIndex].remarks = reason || flight.remarks;
      
      this.flightsSubject.next([...this.mockFlights]);
      return of(this.mockFlights[flightIndex]).pipe(delay(300));
    }
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Cancel a flight
   */
  cancelFlight(flightId: string, reason: string): Observable<Flight> {
    const flightIndex = this.mockFlights.findIndex(f => f.id === flightId);
    if (flightIndex !== -1) {
      this.mockFlights[flightIndex].status = 'CANCELLED';
      this.mockFlights[flightIndex].remarks = reason;
      this.flightsSubject.next([...this.mockFlights]);
      return of(this.mockFlights[flightIndex]).pipe(delay(300));
    }
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Update multiple flight properties
   */
  updateFlight(flightId: string, updates: Partial<Flight>): Observable<Flight> {
    const flightIndex = this.mockFlights.findIndex(f => f.id === flightId);
    if (flightIndex !== -1) {
      this.mockFlights[flightIndex] = {
        ...this.mockFlights[flightIndex],
        ...updates
      };
      this.flightsSubject.next([...this.mockFlights]);
      return of(this.mockFlights[flightIndex]).pipe(delay(300));
    }
    return throwError(() => new Error('Flight not found'));
  }

  /**
   * Get flight statistics
   */
  getFlightStatistics(): Observable<FlightStatistics> {
    // return this.http.get<FlightStatistics>(`${this.apiUrl}/statistics`).pipe(
    //   tap(stats => this.statisticsSubject.next(stats)),
    //   catchError(this.handleError)
    // );
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const flightsToday = this.mockFlights.filter(f => 
      new Date(f.scheduledTime) >= todayStart
    );
    
    const byStatus: Record<FlightStatus, number> = {
      'SCHEDULED': 0,
      'ON_TIME': 0,
      'DELAYED': 0,
      'BOARDING': 0,
      'IN_FLIGHT': 0,
      'LANDED': 0,
      'CANCELLED': 0
    };
    
    const byOperationType: Record<OperationType, number> = {
      'ARRIVAL': 0,
      'DEPARTURE': 0
    };
    
    const byTerminal: Record<string, number> = {};
    let totalDelay = 0;
    let delayedCount = 0;
    
    flightsToday.forEach(flight => {
      byStatus[flight.status]++;
      byOperationType[flight.operationType]++;
      
      if (flight.terminal) {
        byTerminal[flight.terminal] = (byTerminal[flight.terminal] || 0) + 1;
      }
      
      if (flight.status === 'DELAYED' && flight.delayMinutes) {
        totalDelay += flight.delayMinutes;
        delayedCount++;
      }
    });
    
    // Generate peak hours data
    const peakHours: Array<{ hour: number; flightCount: number }> = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(todayStart.getTime() + hour * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourFlights = flightsToday.filter(f => {
        const flightTime = new Date(f.scheduledTime);
        return flightTime >= hourStart && flightTime < hourEnd;
      });
      
      peakHours.push({ hour, flightCount: hourFlights.length });
    }
    
    const statistics: FlightStatistics = {
      totalFlights: flightsToday.length,
      byStatus,
      byOperationType,
      byTerminal,
      averageDelay: delayedCount > 0 ? totalDelay / delayedCount : 0,
      peakHours,
      cancellationsToday: byStatus['CANCELLED'],
      delayedPercentage: flightsToday.length > 0 ? (byStatus['DELAYED'] / flightsToday.length) * 100 : 0,
      onTimePercentage: flightsToday.length > 0 ? ((byStatus['ON_TIME'] + byStatus['SCHEDULED']) / flightsToday.length) * 100 : 0
    };
    
    this.statisticsSubject.next(statistics);
    return of(statistics).pipe(delay(500));
  }

  /**
   * Get real-time updates for a flight
   */
  getFlightRealTimeUpdates(flightId: string): Observable<RealTimeFlightData> {
    return new Observable<RealTimeFlightData>(observer => {
      const flight = this.mockFlights.find(f => f.id === flightId);
      if (!flight) {
        observer.error('Flight not found');
        return;
      }
      
      const intervalId = setInterval(() => {
        const update: RealTimeFlightData = {
          flight,
          timestamp: new Date(),
          position: this.generateRandomPosition(),
          gateOccupied: Math.random() > 0.3,
          fuelStatus: Math.floor(Math.random() * 100),
          crewOnboard: Math.random() > 0.2,
          lastUpdate: new Date().toISOString()
        };
        
        // Update real-time updates subject
        const currentUpdates = this.realTimeUpdatesSubject.value;
        const existingIndex = currentUpdates.findIndex(u => u.flight.id === flightId);
        
        if (existingIndex !== -1) {
          currentUpdates[existingIndex] = update;
        } else {
          currentUpdates.push(update);
        }
        
        this.realTimeUpdatesSubject.next(currentUpdates);
        observer.next(update);
      }, 5000);
      
      return () => clearInterval(intervalId);
    });
  }

  private generateRandomPosition() {
    return {
      latitude: 40.6413 + (Math.random() - 0.5) * 0.1,
      longitude: -73.7781 + (Math.random() - 0.5) * 0.1,
      altitude: 10000 + Math.random() * 30000,
      heading: Math.random() * 360,
      speed: 400 + Math.random() * 200
    };
  }

  /**
   * Predict delay for a flight
   */
  predictFlightDelay(flightNumber: string): Observable<FlightDelayPrediction> {
    const flight = this.mockFlights.find(f => f.flightNumber === flightNumber);
    if (!flight) {
      return throwError(() => new Error('Flight not found'));
    }
    
    const factors = [];
    let baseDelay = 0;
    let confidence = 0.7;
    
    // Time of day factor
    const hour = new Date(flight.scheduledTime).getHours();
    if (hour >= 7 && hour <= 9) {
      factors.push('Morning rush hour');
      baseDelay += 10;
    }
    if (hour >= 16 && hour <= 19) {
      factors.push('Evening rush hour');
      baseDelay += 15;
    }
    
    // Weather factor
    if (Math.random() > 0.6) {
      factors.push('Adverse weather conditions');
      baseDelay += 20;
      confidence -= 0.1;
    }
    
    // Aircraft type factor
    if (flight.aircraftType?.includes('B747') || flight.aircraftType?.includes('A380')) {
      factors.push('Large aircraft requiring special handling');
      baseDelay += 5;
    }
    
    // Previous delays factor
    if (flight.status === 'DELAYED') {
      factors.push('Previous delays in schedule');
      baseDelay += 10;
      confidence += 0.1;
    }
    
    const predictedDelay = Math.max(0, baseDelay + Math.floor(Math.random() * 30));
    
    const suggestedActions = [
      'Consider gate reassignment',
      'Notify ground handling services',
      'Update passenger information systems',
      'Coordinate with air traffic control'
    ];
    
    const estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH' = 
      predictedDelay < 30 ? 'LOW' : predictedDelay < 60 ? 'MEDIUM' : 'HIGH';
    
    const prediction: FlightDelayPrediction = {
      flightNumber,
      predictedDelay,
      confidence: Math.min(0.95, Math.max(0.5, confidence)),
      factors,
      suggestedActions,
      estimatedImpact
    };
    
    return of(prediction).pipe(delay(800));
  }

  /**
   * Search flights by multiple criteria
   */
  searchFlights(criteria: {
    flightNumber?: string;
    airline?: string;
    destination?: string;
    origin?: string;
    status?: FlightStatus;
    dateRange?: { start: Date; end: Date };
  }): Observable<Flight[]> {
    let results = [...this.mockFlights];
    
    if (criteria.flightNumber) {
      results = results.filter(f => 
        f.flightNumber.toLowerCase().includes(criteria.flightNumber!.toLowerCase())
      );
    }
    
    if (criteria.airline) {
      results = results.filter(f => 
        f.airline.toLowerCase().includes(criteria.airline!.toLowerCase())
      );
    }
    
    if (criteria.destination) {
      results = results.filter(f => 
        f.destination.toLowerCase().includes(criteria.destination!.toLowerCase())
      );
    }
    
    if (criteria.origin) {
      results = results.filter(f => 
        f.origin.toLowerCase().includes(criteria.origin!.toLowerCase())
      );
    }
    
    if (criteria.status) {
      results = results.filter(f => f.status === criteria.status);
    }
    
    if (criteria.dateRange) {
      results = results.filter(f => {
        const flightTime = new Date(f.scheduledTime);
        return flightTime >= criteria.dateRange!.start && flightTime <= criteria.dateRange!.end;
      });
    }
    
    return of(results).pipe(delay(300));
  }

  /**
   * Get flights by status
   */
  getFlightsByStatus(status: FlightStatus): Observable<Flight[]> {
    const flights = this.mockFlights.filter(f => f.status === status);
    return of(flights).pipe(delay(200));
  }

  /**
   * Get flights by operation type
   */
  getFlightsByOperationType(operationType: OperationType): Observable<Flight[]> {
    const flights = this.mockFlights.filter(f => f.operationType === operationType);
    return of(flights).pipe(delay(200));
  }

  /**
   * Get current flight delays
   */
  getCurrentDelays(): Observable<{ delayedFlights: number; averageDelay: number; totalDelayMinutes: number }> {
    const delayedFlights = this.mockFlights.filter(f => f.status === 'DELAYED');
    const totalDelayMinutes = delayedFlights.reduce((sum, flight) => sum + (flight.delayMinutes || 0), 0);
    const averageDelay = delayedFlights.length > 0 ? totalDelayMinutes / delayedFlights.length : 0;
    
    return of({
      delayedFlights: delayedFlights.length,
      averageDelay,
      totalDelayMinutes
    }).pipe(delay(200));
  }

  /**
   * Reset all flights to initial state (for simulation)
   */
  resetFlights(): Observable<void> {
    this.generateMockFlights(100);
    this.flightsSubject.next(this.mockFlights);
    return of(void 0).pipe(delay(500));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}