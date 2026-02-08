// Flight Status Types
export type FlightStatus = 
  | 'SCHEDULED'
  | 'ON_TIME'
  | 'DELAYED'
  | 'BOARDING'
  | 'IN_FLIGHT'
  | 'LANDED'
  | 'CANCELLED';

// Operation Types
export type OperationType = 'ARRIVAL' | 'DEPARTURE';

// Aircraft Types
export type AircraftType = 
  | 'B737'
  | 'B747'
  | 'B777'
  | 'B787'
  | 'A320'
  | 'A330'
  | 'A350'
  | 'A380'
  | 'CRJ900'
  | 'ERJ175'
  | 'E195'
  | 'ATR72'
  | 'EMB190'
  | 'B717'
  | 'A321'
  | 'B767'
  | 'B757';

// Flight Priority Levels
export type FlightPriority = 
  | 'NORMAL'
  | 'PRIORITY'
  | 'VIP'
  | 'EMERGENCY'
  | 'CARGO_PRIORITY';

// Flight Class Types
export type FlightClass = 
  | 'ECONOMY'
  | 'PREMIUM_ECONOMY'
  | 'BUSINESS'
  | 'FIRST';

// Main Flight Interface
export interface Flight {
  // Core Identification
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  
  // Operation Details
  operationType: OperationType;
  aircraftType?: AircraftType;
  aircraftRegistration?: string;
  
  // Route Information
  origin: string;
  originCity?: string;
  destination: string;
  destinationCity?: string;
  
  // Schedule Information
  scheduledTime: Date | string;
  estimatedTime?: Date | string;
  actualTime?: Date | string;
  
  // Status Information
  status: FlightStatus;
  delayMinutes?: number;
  delayReason?: string;
  
  // Airport Facilities
  terminal?: string;
  gate?: string;
  checkInDesk?: string;
  baggageClaim?: string;
  runwayAssigned?: string;
  
  // Passenger Information
  passengerCount?: number;
  passengerCapacity?: number;
  flightClasses?: FlightClass[];
  
  // Cargo Information
  cargoWeight?: number;
  cargoCapacity?: number;
  specialCargo?: boolean;
  
  // Crew Information
  captain?: string;
  firstOfficer?: string;
  crewCount?: number;
  
  // Operational Metadata
  priority: FlightPriority;
  remarks?: string;
  isCodeShare: boolean;
  codeShareFlightNumbers?: string[];
  isInternational: boolean;
  
  // Technical Information
  fuelStatus?: number; // percentage
  maintenanceStatus?: 'OK' | 'MINOR' | 'MAJOR';
  lastMaintenance?: Date | string;
  
  // Timestamps
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Additional Metadata
  metadata?: {
    [key: string]: any;
  };
}

// Flight Filter Interface
export interface FlightFilter {
  viewMode?: 'real-time' | 'historical' | 'simulation';
  timePeriod?: number; // minutes
  status?: FlightStatus | 'ALL';
  operationType?: OperationType | 'ALL';
  terminal?: string | 'ALL';
  airline?: string;
  gate?: string;
  origin?: string;
  destination?: string;
  showOnlyDelays?: boolean;
  searchQuery?: string;
  dateRange?: {
    start: Date | string;
    end: Date | string;
  };
  minDelay?: number;
  maxDelay?: number;
}

// Flight Statistics Interface
export interface FlightStatistics {
  totalFlights: number;
  arrivals: number;
  departures: number;
  delayed: number;
  onTime: number;
  cancelled: number;
  byStatus: Record<FlightStatus, number>;
  byOperationType: Record<OperationType, number>;
  byTerminal: Record<string, number>;
  byAirline: Record<string, number>;
  byHour: Record<number, number>;
  averageDelay: number;
  maxDelay: number;
  minDelay: number;
  peakHour: number;
  cancellationsToday: number;
  delayedPercentage: number;
  onTimePercentage: number;
  timestamp: Date | string;
}

// Flight Update Interface
export interface FlightUpdate {
  flightId: string;
  field: keyof Flight;
  oldValue: any;
  newValue: any;
  updatedBy: string;
  timestamp: Date | string;
  reason?: string;
}

// Flight Search Criteria
export interface FlightSearchCriteria {
  flightNumber?: string;
  airline?: string;
  destination?: string;
  origin?: string;
  status?: FlightStatus;
  terminal?: string;
  gate?: string;
  dateRange?: {
    start: Date | string;
    end: Date | string;
  };
  aircraftType?: AircraftType;
  minPassengers?: number;
  maxPassengers?: number;
}

// Flight Delay Prediction Interface
export interface FlightDelayPrediction {
  flightNumber: string;
  predictedDelay: number; // minutes
  confidence: number; // 0-1
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  suggestedActions: string[];
  estimatedImpact: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  timestamp: Date | string;
}

// Flight Timeline Event
export interface FlightTimelineEvent {
  id: string;
  flightId: string;
  eventType: 
    | 'SCHEDULED'
    | 'CHECK_IN_OPEN'
    | 'CHECK_IN_CLOSE'
    | 'BOARDING_START'
    | 'BOARDING_END'
    | 'GATE_OPEN'
    | 'GATE_CLOSE'
    | 'PUSHBACK'
    | 'TAXI_OUT'
    | 'TAKEOFF'
    | 'LANDING'
    | 'TAXI_IN'
    | 'ARRIVAL_AT_GATE'
    | 'BAGGAGE_START'
    | 'BAGGAGE_END';
  scheduledTime: Date | string;
  actualTime?: Date | string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'COMPLETED';
  location?: string;
  remarks?: string;
}

// Flight Connection Information
export interface FlightConnection {
  id: string;
  inboundFlightId: string;
  outboundFlightId: string;
  connectionTime: number; // minutes
  terminalChange: boolean;
  minimumConnectionTime: number; // minutes
  connectionStatus: 'VALID' | 'TIGHT' | 'INVALID' | 'MISSED';
  connectingPassengers: number;
}

// Flight Crew Information
export interface FlightCrew {
  id: string;
  flightId: string;
  captain: {
    name: string;
    licenseNumber: string;
    flightHours: number;
  };
  firstOfficer: {
    name: string;
    licenseNumber: string;
    flightHours: number;
  };
  cabinCrew: Array<{
    name: string;
    position: 'PURSER' | 'SENIOR_FA' | 'FLIGHT_ATTENDANT' | 'TRAINEE';
    base: string;
  }>;
  totalCrew: number;
  restStatus: 'RESTED' | 'MINIMUM_REST' | 'FATIGUED';
}

// Flight Passenger Manifest
export interface PassengerManifest {
  flightId: string;
  totalPassengers: number;
  passengerList: Array<{
    seatNumber: string;
    passengerName: string;
    class: FlightClass;
    specialNeeds?: string[];
    connectingFlight?: string;
    checkedIn: boolean;
    boarded: boolean;
  }>;
  specialPassengers: {
    infants: number;
    unaccompaniedMinors: number;
    wheelchair: number;
    specialMeals: number;
  };
}

// Flight Cargo Manifest
export interface CargoManifest {
  flightId: string;
  totalWeight: number; // kg
  totalVolume: number; // cubic meters
  cargoItems: Array<{
    awbNumber: string;
    description: string;
    weight: number;
    volume: number;
    specialHandling?: 'COOL' | 'DANGEROUS' | 'LIVE_ANIMALS' | 'VALUABLE';
    destination: string;
    consignee: string;
  }>;
  specialCargo: {
    dangerousGoods: boolean;
    liveAnimals: boolean;
    perishable: boolean;
    valuable: boolean;
  };
}

// Flight Performance Metrics
export interface FlightPerformance {
  flightId: string;
  fuelEfficiency: number; // liters per passenger per 100km
  onTimePerformance: number; // percentage
  passengerLoadFactor: number; // percentage
  cargoLoadFactor: number; // percentage
  revenue: number;
  costs: number;
  profitability: number;
  customerSatisfaction?: number; // 1-5
  environmentalImpact: {
    co2Emissions: number; // kg
    noiseLevel: number; // dB
  };
}

// Flight Real-time Position
export interface FlightPosition {
  flightId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number; // knots
  verticalSpeed: number; // feet per minute
  timestamp: Date | string;
  squawkCode?: string;
  nextWaypoint?: string;
  estimatedArrival?: Date | string;
  distanceToDestination: number; // km
  weatherAtPosition?: {
    temperature: number;
    turbulence: 'NONE' | 'LIGHT' | 'MODERATE' | 'SEVERE';
    windSpeed: number;
    windDirection: number;
  };
}

// Flight Alert
export interface FlightAlert {
  id: string;
  flightId: string;
  type: 
    | 'DELAY'
    | 'CANCELLATION'
    | 'GATE_CHANGE'
    | 'TERMINAL_CHANGE'
    | 'WEATHER'
    | 'TECHNICAL'
    | 'SECURITY'
    | 'CREW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  startTime: Date | string;
  endTime?: Date | string;
  acknowledged: boolean;
  actionRequired: boolean;
  affectedPassengers?: number;
  mitigationActions?: string[];
}

// Flight Schedule Batch
export interface FlightScheduleBatch {
  id: string;
  date: Date | string;
  flights: Flight[];
  status: 'GENERATED' | 'PUBLISHED' | 'UPDATED' | 'ARCHIVED';
  generatedBy: string;
  generationTime: Date | string;
  changesFromPrevious?: number;
}

// Flight Historical Data
export interface FlightHistoricalData {
  flightNumber: string;
  dates: Date[] | string[];
  delays: number[];
  cancellations: boolean[];
  loadFactors: number[];
  passengerCounts: number[];
  averageDelay: number;
  cancellationRate: number;
  onTimePerformance: number;
  reliabilityScore: number; // 0-100
}

// Flight Service Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date | string;
  requestId?: string;
}

// Paginated Flight Response
export interface PaginatedFlights {
  flights: Flight[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Flight Bulk Update Request
export interface FlightBulkUpdateRequest {
  flightIds: string[];
  updates: Partial<Flight>;
  reason: string;
  userId: string;
}

// Flight Import/Export Format
export interface FlightImportFormat {
  flightNumber: string;
  airline: string;
  airlineCode: string;
  operationType: OperationType;
  origin: string;
  destination: string;
  scheduledTime: string; // ISO string
  terminal?: string;
  gate?: string;
  aircraftType?: AircraftType;
  status?: FlightStatus;
}

// Flight Dashboard Summary
export interface FlightDashboardSummary {
  currentFlights: number;
  arrivalsNextHour: number;
  departuresNextHour: number;
  delayedFlights: number;
  cancelledFlights: number;
  onTimePercentage: number;
  averageDelay: number;
  busiestTerminal: string;
  busiestHour: number;
  weatherImpact: 'NONE' | 'MINOR' | 'MODERATE' | 'MAJOR';
  alerts: number;
  lastUpdated: Date | string;
}

// Utility Types
export type FlightField = keyof Flight;
export type FlightStatusColorMap = Record<FlightStatus, string>;
export type OperationTypeColorMap = Record<OperationType, string>;

// Constants
export const FLIGHT_STATUS_COLORS: FlightStatusColorMap = {
  'SCHEDULED': '#2196F3', // Blue
  'ON_TIME': '#4CAF50',   // Green
  'DELAYED': '#FF9800',   // Orange
  'BOARDING': '#9C27B0',  // Purple
  'IN_FLIGHT': '#3F51B5', // Indigo
  'LANDED': '#009688',    // Teal
  'CANCELLED': '#F44336'  // Red
};

export const OPERATION_TYPE_COLORS: OperationTypeColorMap = {
  'ARRIVAL': '#4CAF50',   // Green
  'DEPARTURE': '#2196F3'  // Blue
};

export const FLIGHT_STATUS_LABELS: Record<FlightStatus, string> = {
  'SCHEDULED': 'Scheduled',
  'ON_TIME': 'On Time',
  'DELAYED': 'Delayed',
  'BOARDING': 'Boarding',
  'IN_FLIGHT': 'In Flight',
  'LANDED': 'Landed',
  'CANCELLED': 'Cancelled'
};

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  'ARRIVAL': 'Arrival',
  'DEPARTURE': 'Departure'
};