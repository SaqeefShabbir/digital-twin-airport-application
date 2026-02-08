import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap, delay } from 'rxjs/operators';

// Define type literals explicitly
export type FacilityStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'CLOSED' | 'CONGESTED';
export type FacilityType = 'TERMINAL' | 'GATE' | 'RUNWAY' | 'TAXIWAY' | 'PARKING_STAND' | 'CHECK_IN' | 'SECURITY' | 'BAGGAGE_CLAIM';
export type TerminalStatus = 'OPEN' | 'CLOSED' | 'PARTIAL';
export type RunwayStatus = 'ACTIVE' | 'CLOSED' | 'MAINTENANCE';
export type AirportOverallStatus = 'NORMAL' | 'BUSY' | 'CONGESTED' | 'EMERGENCY';
export type WeatherCondition = 'CLEAR' | 'CLOUDY' | 'RAIN' | 'FOG' | 'SNOW' | 'STORM';
export type AlertType = 'WEATHER' | 'SECURITY' | 'OPERATIONAL' | 'TECHNICAL' | 'SAFETY';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GroundServiceType = 'FUEL' | 'CATERING' | 'CLEANING' | 'BAGGAGE' | 'DEICING' | 'WATER' | 'TOILET';
export type GroundServiceStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

export interface AirportFacility {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  capacity: number;
  currentUtilization: number;
  location: {
    x: number;
    y: number;
    z?: number;
  };
  metadata?: any;
}

export interface Terminal {
  id: string;
  code: string;
  name: string;
  status: TerminalStatus;
  capacity: number;
  currentOccupancy: number;
  gates: string[];
  facilities: string[];
  checkInCounters: number;
  securityCheckpoints: number;
  baggageBelts: number;
  openingHours: {
    open: string;
    close: string;
  };
}

export interface Runway {
  id: string;
  name: string;
  length: number; // meters
  width: number; // meters
  surface: 'ASPHALT' | 'CONCRETE' | 'GRASS';
  status: RunwayStatus;
  windDirection: number; // degrees
  approaches: string[];
  lighting: boolean;
  instrumentLanding: boolean;
}

export interface AirportStatus {
  overallStatus: AirportOverallStatus;
  weather: {
    temperature: number;
    condition: WeatherCondition;
    visibility: number; // meters
    windSpeed: number; // km/h
    windDirection: number; // degrees
    precipitation: number; // mm/h
  };
  operations: {
    arrivalsPerHour: number;
    departuresPerHour: number;
    totalOperations: number;
    peakHour: number;
  };
  alerts: AirportAlert[];
  lastUpdated: Date;
}

export interface AirportAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  facilityId?: string;
  startTime: Date;
  endTime?: Date;
  acknowledged: boolean;
  actionRequired: boolean;
}

export interface GroundService {
  id: string;
  type: GroundServiceType;
  status: GroundServiceStatus;
  location: string;
  assignedFlight?: string;
  estimatedCompletion?: Date;
}

export interface AirportMetrics {
  timestamp: Date;
  passengerFlow: number; // passengers per hour
  baggageThroughput: number; // bags per hour
  securityWaitTime: number; // minutes
  immigrationWaitTime: number; // minutes
  parkingUtilization: number; // percentage
  retailSales: number; // revenue per hour
  energyConsumption: number; // kWh
  waterUsage: number; // liters
  carbonEmissions: number; // kg CO2
}

@Injectable({
  providedIn: 'root'
})
export class AirportService {
  private apiUrl = 'api/airport'; // Base API URL
  private statusSubject = new BehaviorSubject<AirportStatus | null>(null);
  private facilitiesSubject = new BehaviorSubject<AirportFacility[]>([]);
  private terminalsSubject = new BehaviorSubject<Terminal[]>([]);
  private runwaysSubject = new BehaviorSubject<Runway[]>([]);
  private alertsSubject = new BehaviorSubject<AirportAlert[]>([]);
  private metricsSubject = new BehaviorSubject<AirportMetrics | null>(null);
  private groundServicesSubject = new BehaviorSubject<GroundService[]>([]);
  
  status$ = this.statusSubject.asObservable();
  facilities$ = this.facilitiesSubject.asObservable();
  terminals$ = this.terminalsSubject.asObservable();
  runways$ = this.runwaysSubject.asObservable();
  alerts$ = this.alertsSubject.asObservable();
  metrics$ = this.metricsSubject.asObservable();
  groundServices$ = this.groundServicesSubject.asObservable();
  
  // Mock data
  private mockTerminals: Terminal[] = [
    {
      id: 'T1',
      code: 'T1',
      name: 'Terminal 1',
      status: 'OPEN',
      capacity: 5000,
      currentOccupancy: 3200,
      gates: ['G01', 'G02', 'G03', 'G04', 'G05'],
      facilities: ['SEC1', 'CHK1', 'BAG1', 'LOU1'],
      checkInCounters: 30,
      securityCheckpoints: 4,
      baggageBelts: 6,
      openingHours: { open: '04:00', close: '01:00' }
    },
    {
      id: 'T2',
      code: 'T2',
      name: 'Terminal 2',
      status: 'OPEN',
      capacity: 7500,
      currentOccupancy: 4500,
      gates: ['G06', 'G07', 'G08', 'G09', 'G10', 'G11'],
      facilities: ['SEC2', 'CHK2', 'BAG2', 'LOU2'],
      checkInCounters: 45,
      securityCheckpoints: 6,
      baggageBelts: 8,
      openingHours: { open: '04:00', close: '01:00' }
    },
    {
      id: 'T3',
      code: 'T3',
      name: 'Terminal 3',
      status: 'OPEN',
      capacity: 10000,
      currentOccupancy: 6800,
      gates: ['G12', 'G13', 'G14', 'G15', 'G16', 'G17', 'G18'],
      facilities: ['SEC3', 'CHK3', 'BAG3', 'LOU3'],
      checkInCounters: 60,
      securityCheckpoints: 8,
      baggageBelts: 10,
      openingHours: { open: '24/7', close: '24/7' }
    },
    {
      id: 'T4',
      code: 'T4',
      name: 'Terminal 4 (International)',
      status: 'OPEN',
      capacity: 8000,
      currentOccupancy: 5200,
      gates: ['G19', 'G20', 'G21', 'G22', 'G23'],
      facilities: ['SEC4', 'CHK4', 'BAG4', 'LOU4', 'IMM1'],
      checkInCounters: 40,
      securityCheckpoints: 5,
      baggageBelts: 7,
      openingHours: { open: '24/7', close: '24/7' }
    },
    {
      id: 'T5',
      code: 'T5',
      name: 'Terminal 5 (Cargo)',
      status: 'OPEN',
      capacity: 3000,
      currentOccupancy: 1800,
      gates: ['C01', 'C02', 'C03'],
      facilities: ['CARGO1', 'CARGO2'],
      checkInCounters: 10,
      securityCheckpoints: 2,
      baggageBelts: 3,
      openingHours: { open: '24/7', close: '24/7' }
    }
  ];
  
  private mockRunways: Runway[] = [
    {
      id: 'RWY13L-31R',
      name: '13L/31R',
      length: 3682,
      width: 60,
      surface: 'ASPHALT',
      status: 'ACTIVE',
      windDirection: 130,
      approaches: ['ILS', 'RNAV'],
      lighting: true,
      instrumentLanding: true
    },
    {
      id: 'RWY13R-31L',
      name: '13R/31L',
      length: 3048,
      width: 45,
      surface: 'ASPHALT',
      status: 'ACTIVE',
      windDirection: 130,
      approaches: ['ILS', 'RNAV'],
      lighting: true,
      instrumentLanding: true
    },
    {
      id: 'RWY04-22',
      name: '04/22',
      length: 2560,
      width: 45,
      surface: 'ASPHALT',
      status: 'MAINTENANCE',
      windDirection: 40,
      approaches: ['RNAV'],
      lighting: true,
      instrumentLanding: false
    }
  ];
  
  private mockFacilities: AirportFacility[] = [];
  private mockAlerts: AirportAlert[] = [];
  private mockGroundServices: GroundService[] = [];
  
  constructor(private http: HttpClient) {
    this.initializeMockData();
    this.startRealTimeUpdates();
  }
  
  private initializeMockData(): void {
    // Initialize facilities with explicit type annotations
    const gateFacilities: AirportFacility[] = Array.from({ length: 23 }, (_, i) => {
      const randomStatus = this.getRandomFacilityStatus();
      return {
        id: `G${(i + 1).toString().padStart(2, '0')}`,
        name: `Gate ${i + 1}`,
        type: 'GATE' as FacilityType,
        status: randomStatus,
        capacity: 200,
        currentUtilization: Math.floor(Math.random() * 200),
        location: { x: 100 + i * 50, y: 200 }
      };
    });
    
    const securityFacilities: AirportFacility[] = Array.from({ length: 8 }, (_, i) => ({
      id: `SEC${i + 1}`,
      name: `Security Checkpoint ${i + 1}`,
      type: 'SECURITY' as FacilityType,
      status: 'OPERATIONAL' as FacilityStatus,
      capacity: 300,
      currentUtilization: Math.floor(Math.random() * 300),
      location: { x: 150 + i * 40, y: 100 }
    }));
    
    const baggageFacilities: AirportFacility[] = Array.from({ length: 10 }, (_, i) => ({
      id: `BAG${i + 1}`,
      name: `Baggage Claim ${i + 1}`,
      type: 'BAGGAGE_CLAIM' as FacilityType,
      status: 'OPERATIONAL' as FacilityStatus,
      capacity: 500,
      currentUtilization: Math.floor(Math.random() * 500),
      location: { x: 200 + i * 35, y: 300 }
    }));
    
    this.mockFacilities = [...gateFacilities, ...securityFacilities, ...baggageFacilities];
    
    // Initialize alerts
    this.mockAlerts = [
      {
        id: 'ALERT001',
        type: 'WEATHER',
        severity: 'MEDIUM',
        message: 'Fog advisory in effect. Reduced visibility expected until 10:00 AM',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        acknowledged: false,
        actionRequired: true
      },
      {
        id: 'ALERT002',
        type: 'OPERATIONAL',
        severity: 'LOW',
        message: 'Runway 04/22 closed for scheduled maintenance until 6:00 PM',
        facilityId: 'RWY04-22',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        acknowledged: true,
        actionRequired: false
      },
      {
        id: 'ALERT003',
        type: 'OPERATIONAL',
        severity: 'HIGH',
        message: 'High congestion at Terminal 3 security checkpoints',
        facilityId: 'SEC3',
        startTime: new Date(),
        acknowledged: false,
        actionRequired: true
      }
    ];
    
    // Initialize ground services
    this.mockGroundServices = [
      { id: 'FUEL01', type: 'FUEL', status: 'AVAILABLE', location: 'Fuel Station 1' },
      { id: 'FUEL02', type: 'FUEL', status: 'BUSY', location: 'Fuel Station 2', assignedFlight: 'DL123' },
      { id: 'CATER01', type: 'CATERING', status: 'AVAILABLE', location: 'Catering Building' },
      { id: 'CLEAN01', type: 'CLEANING', status: 'BUSY', location: 'Gate G05', assignedFlight: 'AA456' },
      { id: 'BAG01', type: 'BAGGAGE', status: 'AVAILABLE', location: 'Baggage Handling Area' },
      { id: 'DEICE01', type: 'DEICING', status: 'UNAVAILABLE', location: 'Deicing Pad 1' }
    ];
    
    // Set initial data
    this.facilitiesSubject.next(this.mockFacilities);
    this.terminalsSubject.next(this.mockTerminals);
    this.runwaysSubject.next(this.mockRunways);
    this.alertsSubject.next(this.mockAlerts);
    this.groundServicesSubject.next(this.mockGroundServices);
  }
  
  private getRandomFacilityStatus(): FacilityStatus {
    const statuses: FacilityStatus[] = ['OPERATIONAL', 'MAINTENANCE', 'CLOSED', 'CONGESTED'];
    // Weight the probabilities
    const weights = [0.7, 0.1, 0.05, 0.15]; // 70% OPERATIONAL, 10% MAINTENANCE, 5% CLOSED, 15% CONGESTED
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return statuses[i];
      }
    }
    
    return 'OPERATIONAL'; // Fallback
  }
  
  private startRealTimeUpdates(): void {
    // Update airport status every 30 seconds
    setInterval(() => {
      this.updateAirportStatus();
      this.updateMetrics();
    }, 30000);
    
    // Update facilities utilization every minute
    setInterval(() => {
      this.updateFacilitiesUtilization();
    }, 60000);
  }
  
  private updateAirportStatus(): void {
    const weatherConditions: WeatherCondition[] = ['CLEAR', 'CLOUDY', 'RAIN', 'FOG', 'SNOW', 'STORM'];
    const overallStatuses: AirportOverallStatus[] = ['NORMAL', 'BUSY', 'CONGESTED', 'EMERGENCY'];
    
    const status: AirportStatus = {
      overallStatus: overallStatuses[Math.floor(Math.random() * 3)] as AirportOverallStatus, // Exclude EMERGENCY for normal simulation
      weather: {
        temperature: 15 + Math.random() * 20,
        condition: weatherConditions[Math.floor(Math.random() * weatherConditions.length)] as WeatherCondition,
        visibility: 5000 + Math.random() * 10000,
        windSpeed: 5 + Math.random() * 40,
        windDirection: Math.random() * 360,
        precipitation: Math.random() > 0.7 ? Math.random() * 10 : 0
      },
      operations: {
        arrivalsPerHour: 20 + Math.floor(Math.random() * 30),
        departuresPerHour: 20 + Math.floor(Math.random() * 30),
        totalOperations: 150 + Math.floor(Math.random() * 100),
        peakHour: 9 + Math.floor(Math.random() * 8)
      },
      alerts: this.mockAlerts.filter(alert => !alert.acknowledged),
      lastUpdated: new Date()
    };
    
    this.statusSubject.next(status);
  }
  
  private updateMetrics(): void {
    const metrics: AirportMetrics = {
      timestamp: new Date(),
      passengerFlow: 500 + Math.floor(Math.random() * 2000),
      baggageThroughput: 1000 + Math.floor(Math.random() * 5000),
      securityWaitTime: 5 + Math.random() * 30,
      immigrationWaitTime: 10 + Math.random() * 45,
      parkingUtilization: 60 + Math.random() * 40,
      retailSales: 10000 + Math.random() * 50000,
      energyConsumption: 5000 + Math.random() * 20000,
      waterUsage: 10000 + Math.random() * 50000,
      carbonEmissions: 1000 + Math.random() * 4000
    };
    
    this.metricsSubject.next(metrics);
  }
  
  private updateFacilitiesUtilization(): void {
    const updatedFacilities = this.mockFacilities.map(facility => {
      const newUtilization = Math.min(
        facility.capacity,
        Math.max(0, facility.currentUtilization + (Math.random() - 0.5) * 20)
      );
      const newStatus = this.determineFacilityStatus(newUtilization, facility.capacity);
      
      return {
        ...facility,
        currentUtilization: newUtilization,
        status: newStatus
      };
    });
    
    this.mockFacilities = updatedFacilities;
    this.facilitiesSubject.next(updatedFacilities);
  }
  
  private determineFacilityStatus(utilization: number, capacity: number): FacilityStatus {
    const utilizationPercentage = (utilization / capacity) * 100;
    
    if (utilizationPercentage > 90) return 'CONGESTED';
    if (utilizationPercentage > 70) return 'OPERATIONAL';
    if (Math.random() > 0.95) return 'MAINTENANCE';
    if (Math.random() > 0.98) return 'CLOSED';
    
    return 'OPERATIONAL';
  }
  
  /**
   * Get all terminals
   */
  getTerminals(): Terminal[] {
    return this.mockTerminals;
  }
  
  getTerminalsObservable(): Observable<Terminal[]> {
    return of(this.mockTerminals).pipe(delay(200));
  }
  
  /**
   * Get terminal by ID
   */
  getTerminalById(terminalId: string): Observable<Terminal> {
    const terminal = this.mockTerminals.find(t => t.id === terminalId);
    if (terminal) {
      return of(terminal).pipe(delay(200));
    }
    return throwError(() => new Error('Terminal not found'));
  }
  
  /**
   * Get terminal by code
   */
  getTerminalByCode(code: string): Observable<Terminal> {
    const terminal = this.mockTerminals.find(t => t.code === code);
    if (terminal) {
      return of(terminal).pipe(delay(200));
    }
    return throwError(() => new Error('Terminal not found'));
  }
  
  /**
   * Get all runways
   */
  getRunways(): Observable<Runway[]> {
    return of(this.mockRunways).pipe(delay(200));
  }
  
  /**
   * Get runway by ID
   */
  getRunwayById(runwayId: string): Observable<Runway> {
    const runway = this.mockRunways.find(r => r.id === runwayId);
    if (runway) {
      return of(runway).pipe(delay(200));
    }
    return throwError(() => new Error('Runway not found'));
  }
  
  /**
   * Get active runways
   */
  getActiveRunways(): Observable<Runway[]> {
    const activeRunways = this.mockRunways.filter(r => r.status === 'ACTIVE');
    return of(activeRunways).pipe(delay(200));
  }
  
  /**
   * Get airport status
   */
  getAirportStatus(): Observable<AirportStatus> {
    this.updateAirportStatus();
    return this.status$.pipe(
      map(status => status || this.generateDefaultStatus())
    );
  }
  
  private generateDefaultStatus(): AirportStatus {
    return {
      overallStatus: 'NORMAL',
      weather: {
        temperature: 20,
        condition: 'CLEAR',
        visibility: 10000,
        windSpeed: 15,
        windDirection: 180,
        precipitation: 0
      },
      operations: {
        arrivalsPerHour: 25,
        departuresPerHour: 25,
        totalOperations: 200,
        peakHour: 14
      },
      alerts: [],
      lastUpdated: new Date()
    };
  }
  
  /**
   * Get all facilities
   */
  getFacilities(): Observable<AirportFacility[]> {
    return of(this.mockFacilities).pipe(delay(200));
  }
  
  /**
   * Get facility by ID
   */
  getFacilityById(facilityId: string): Observable<AirportFacility> {
    const facility = this.mockFacilities.find(f => f.id === facilityId);
    if (facility) {
      return of(facility).pipe(delay(200));
    }
    return throwError(() => new Error('Facility not found'));
  }
  
  /**
   * Get facilities by type
   */
  getFacilitiesByType(type: FacilityType): Observable<AirportFacility[]> {
    const facilities = this.mockFacilities.filter(f => f.type === type);
    return of(facilities).pipe(delay(200));
  }
  
  /**
   * Get all alerts
   */
  getAlerts(): Observable<AirportAlert[]> {
    return of(this.mockAlerts).pipe(delay(200));
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts(): Observable<AirportAlert[]> {
    const activeAlerts = this.mockAlerts.filter(alert => !alert.acknowledged);
    return of(activeAlerts).pipe(delay(200));
  }
  
  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): Observable<AirportAlert> {
    const alertIndex = this.mockAlerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      this.mockAlerts[alertIndex].acknowledged = true;
      this.alertsSubject.next([...this.mockAlerts]);
      return of(this.mockAlerts[alertIndex]).pipe(delay(200));
    }
    return throwError(() => new Error('Alert not found'));
  }
  
  /**
   * Create a new alert
   */
  createAlert(alert: Omit<AirportAlert, 'id' | 'startTime' | 'acknowledged'>): Observable<AirportAlert> {
    const newAlert: AirportAlert = {
      ...alert,
      id: `ALERT${(this.mockAlerts.length + 1).toString().padStart(3, '0')}`,
      startTime: new Date(),
      acknowledged: false
    };
    
    this.mockAlerts.push(newAlert);
    this.alertsSubject.next([...this.mockAlerts]);
    return of(newAlert).pipe(delay(300));
  }
  
  /**
   * Get airport metrics
   */
  getMetrics(): Observable<AirportMetrics> {
    this.updateMetrics();
    return this.metrics$.pipe(
      map(metrics => metrics || this.generateDefaultMetrics())
    );
  }
  
  private generateDefaultMetrics(): AirportMetrics {
    return {
      timestamp: new Date(),
      passengerFlow: 1500,
      baggageThroughput: 3000,
      securityWaitTime: 15,
      immigrationWaitTime: 25,
      parkingUtilization: 75,
      retailSales: 30000,
      energyConsumption: 15000,
      waterUsage: 30000,
      carbonEmissions: 2500
    };
  }
  
  /**
   * Get ground services
   */
  getGroundServices(): Observable<GroundService[]> {
    return of(this.mockGroundServices).pipe(delay(200));
  }
  
  /**
   * Update ground service status
   */
  updateGroundServiceStatus(serviceId: string, status: GroundServiceStatus, assignedFlight?: string): Observable<GroundService> {
    const serviceIndex = this.mockGroundServices.findIndex(s => s.id === serviceId);
    if (serviceIndex !== -1) {
      this.mockGroundServices[serviceIndex].status = status;
      if (assignedFlight) {
        this.mockGroundServices[serviceIndex].assignedFlight = assignedFlight;
      }
      this.groundServicesSubject.next([...this.mockGroundServices]);
      return of(this.mockGroundServices[serviceIndex]).pipe(delay(200));
    }
    return throwError(() => new Error('Service not found'));
  }
  
  /**
   * Get facility utilization statistics
   */
  getFacilityUtilization(): Observable<{ type: FacilityType; utilization: number; capacity: number }[]> {
    const types = Array.from(new Set(this.mockFacilities.map(f => f.type))) as FacilityType[];
    const utilization = types.map(type => {
      const facilitiesOfType = this.mockFacilities.filter(f => f.type === type);
      const totalCapacity = facilitiesOfType.reduce((sum, f) => sum + f.capacity, 0);
      const totalUtilization = facilitiesOfType.reduce((sum, f) => sum + f.currentUtilization, 0);
      return {
        type,
        utilization: totalCapacity > 0 ? (totalUtilization / totalCapacity) * 100 : 0,
        capacity: totalCapacity
      };
    });
    
    return of(utilization).pipe(delay(200));
  }
  
  /**
   * Get terminal occupancy
   */
  getTerminalOccupancy(): Observable<{ terminal: string; occupancy: number; capacity: number; percentage: number }[]> {
    const occupancy = this.mockTerminals.map(terminal => ({
      terminal: terminal.code,
      occupancy: terminal.currentOccupancy,
      capacity: terminal.capacity,
      percentage: (terminal.currentOccupancy / terminal.capacity) * 100
    }));
    
    return of(occupancy).pipe(delay(200));
  }
  
  /**
   * Update terminal occupancy
   */
  updateTerminalOccupancy(terminalId: string, occupancy: number): Observable<Terminal> {
    const terminalIndex = this.mockTerminals.findIndex(t => t.id === terminalId);
    if (terminalIndex !== -1) {
      this.mockTerminals[terminalIndex].currentOccupancy = Math.min(
        this.mockTerminals[terminalIndex].capacity,
        Math.max(0, occupancy)
      );
      this.terminalsSubject.next([...this.mockTerminals]);
      return of(this.mockTerminals[terminalIndex]).pipe(delay(200));
    }
    return throwError(() => new Error('Terminal not found'));
  }
  
  /**
   * Get airport capacity summary
   */
  getCapacitySummary(): Observable<{
    totalGates: number;
    availableGates: number;
    totalRunways: number;
    activeRunways: number;
    totalTerminals: number;
    totalCapacity: number;
    currentOccupancy: number;
  }> {
    const totalGates = this.mockFacilities.filter(f => f.type === 'GATE').length;
    const availableGates = this.mockFacilities.filter(f => 
      f.type === 'GATE' && f.status === 'OPERATIONAL'
    ).length;
    
    const totalRunways = this.mockRunways.length;
    const activeRunways = this.mockRunways.filter(r => r.status === 'ACTIVE').length;
    
    const totalTerminals = this.mockTerminals.length;
    const totalCapacity = this.mockTerminals.reduce((sum, t) => sum + t.capacity, 0);
    const currentOccupancy = this.mockTerminals.reduce((sum, t) => sum + t.currentOccupancy, 0);
    
    const summary = {
      totalGates,
      availableGates,
      totalRunways,
      activeRunways,
      totalTerminals,
      totalCapacity,
      currentOccupancy
    };
    
    return of(summary).pipe(delay(200));
  }
  
  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}