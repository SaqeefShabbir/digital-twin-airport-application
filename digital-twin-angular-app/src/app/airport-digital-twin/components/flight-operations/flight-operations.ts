import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { FlightService } from '../../services/flight.service';
import { Flight, FlightStatus, OperationType, FlightFilter } from '../../models/flight.interface';
import { AirportService, Terminal } from '../../services/airport.service';

@Component({
  selector: 'app-flight-operations',
  templateUrl: './flight-operations.html',
  standalone: false,
  styleUrls: ['./flight-operations.scss']
})
export class FlightOperations implements OnInit, OnDestroy {
  @Input() viewMode: 'real-time' | 'historical' | 'simulation' = 'real-time';
  @Input() autoRefresh: boolean = true;
  @Input() refreshInterval: number = 10000; // 10 seconds
  @Input() showOnlyDelays: boolean = false;
  @Output() flightSelected = new EventEmitter<Flight>();
  @Output() operationFiltered = new EventEmitter<any>();
  @ViewChild('operationsContainer') operationsContainer!: ElementRef;

  currentDate: Date = new Date();

  // Flight data
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  
  // Filter properties
  statusFilter: FlightStatus | 'ALL' = 'ALL';
  operationTypeFilter: OperationType | 'ALL' = 'ALL';
  terminalFilter: string = 'ALL';
  searchQuery: string = '';
  
  // Statistics
  stats = {
    totalFlights: 0,
    arrivals: 0,
    departures: 0,
    delayed: 0,
    onTime: 0,
    cancelled: 0
  };
  
  // UI state
  isLoading: boolean = false;
  showFilters: boolean = true;
  sortField: keyof Flight = 'scheduledTime';
  sortDirection: 'asc' | 'desc' = 'asc';
  selectedFlight: Flight | null = null;
  
  // Terminal information
  terminals: Terminal[] = [];
  
  // Time periods for filtering
  timePeriods = [
    { label: 'Next 1 hour', value: 60 },
    { label: 'Next 3 hours', value: 180 },
    { label: 'Next 6 hours', value: 360 },
    { label: 'Next 12 hours', value: 720 },
    { label: 'Next 24 hours', value: 1440 }
  ];
  selectedTimePeriod: number = 180; // Default: 3 hours
  
  // Subscriptions
  private refreshSubscription?: Subscription;
  private flightSubscription?: Subscription;

  constructor(
    private flightService: FlightService,
    private airportService: AirportService
  ) {}

  ngOnInit(): void {
    this.loadFlights();
    
    // Set up auto-refresh if enabled
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    }
    
    // Listen to airport service for terminal updates
    this.terminals = this.airportService.getTerminals();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  loadFlights(): void {
    this.isLoading = true;
    
    this.flightSubscription = this.flightService.getFlights({
      viewMode: this.viewMode,
      timePeriod: this.selectedTimePeriod,
      showOnlyDelays: this.showOnlyDelays
    }).subscribe({
      next: (flights) => {
        this.flights = flights;
        this.applyFilters();
        this.calculateStatistics();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading flights:', error);
        this.isLoading = false;
      }
    });
  }

  setupAutoRefresh(): void {
    this.refreshSubscription = interval(this.refreshInterval)
      .subscribe(() => {
        if (!this.isLoading) {
          this.loadFlights();
        }
      });
  }

  cleanupSubscriptions(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.flightSubscription) {
      this.flightSubscription.unsubscribe();
    }
  }

  applyFilters(): void {
    let filtered = [...this.flights];
    
    // Apply status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(flight => flight.status === this.statusFilter);
    }
    
    // Apply operation type filter
    if (this.operationTypeFilter !== 'ALL') {
      filtered = filtered.filter(flight => flight.operationType === this.operationTypeFilter);
    }
    
    // Apply terminal filter
    if (this.terminalFilter !== 'ALL') {
      filtered = filtered.filter(flight => flight.terminal === this.terminalFilter);
    }
    
    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(flight => 
        flight.flightNumber.toLowerCase().includes(query) ||
        flight.airline.toLowerCase().includes(query) ||
        flight.destination.toLowerCase().includes(query) ||
        flight.origin.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[this.sortField];
      const bValue = b[this.sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      return 0;
    });
    
    this.filteredFlights = filtered;
    this.operationFiltered.emit({
      filteredCount: this.filteredFlights.length,
      totalCount: this.flights.length
    });
  }

  calculateStatistics(): void {
    this.stats = {
      totalFlights: this.flights.length,
      arrivals: this.flights.filter(f => f.operationType === 'ARRIVAL').length,
      departures: this.flights.filter(f => f.operationType === 'DEPARTURE').length,
      delayed: this.flights.filter(f => f.status === 'DELAYED').length,
      onTime: this.flights.filter(f => f.status === 'ON_TIME').length,
      cancelled: this.flights.filter(f => f.status === 'CANCELLED').length
    };
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  onSort(field: keyof Flight): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  onFlightSelect(flight: Flight): void {
    this.selectedFlight = flight;
    this.flightSelected.emit(flight);
  }

  onTimePeriodChange(): void {
    this.loadFlights();
  }

  onToggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
    }
  }

  onToggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  getStatusClass(status: FlightStatus): string {
    switch (status) {
      case 'ON_TIME': return 'status-on-time';
      case 'DELAYED': return 'status-delayed';
      case 'BOARDING': return 'status-boarding';
      case 'IN_FLIGHT': return 'status-in-flight';
      case 'LANDED': return 'status-landed';
      case 'CANCELLED': return 'status-cancelled';
      case 'SCHEDULED': return 'status-scheduled';
      default: return 'status-unknown';
    }
  }

  getOperationTypeIcon(operationType: OperationType): string {
    switch (operationType) {
      case 'ARRIVAL': return 'flight_land';
      case 'DEPARTURE': return 'flight_takeoff';
      default: return 'flight';
    }
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getDelayMinutes(flight: Flight): number {
    if (!flight.actualTime || !flight.scheduledTime) return 0;
    const scheduled = new Date(flight.scheduledTime).getTime();
    const actual = new Date(flight.actualTime).getTime();
    return Math.round((actual - scheduled) / (1000 * 60));
  }

  refreshData(): void {
    this.loadFlights();
  }

  clearFilters(): void {
    this.statusFilter = 'ALL';
    this.operationTypeFilter = 'ALL';
    this.terminalFilter = 'ALL';
    this.searchQuery = '';
    this.applyFilters();
  }
}