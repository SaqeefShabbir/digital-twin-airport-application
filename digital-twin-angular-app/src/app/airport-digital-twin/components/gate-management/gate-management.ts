import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { Subscription, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AirportDataService } from '../../services/airport-data.service';
import { GateService } from '../../services/gate.service';
import { GateStatus, FlightStatus } from '../../models/airport-models';
import { GateAssignmentDialog } from '../gate-assignment-dialog/gate-assignment-dialog';
import { BulkGateOperationDialog } from '../bulk-gate-operation-dialog/bulk-gate-operation-dialog';

@Component({
  selector: 'app-gate-management',
  templateUrl: './gate-management.html',
  standalone: false,
  styleUrls: ['./gate-management.scss']
})
export class GateManagement implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Table configuration
  displayedColumns: string[] = ['select', 'gateNumber', 'terminal', 'status', 'currentFlight', 'nextFlight', 'nextFlightTime', 'actions'];
  dataSource = new MatTableDataSource<GateStatus>();
  selection = new SelectionModel<GateStatus>(true, []);
  
  // Filters
  filterForm: FormGroup;
  statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Available', label: 'Available', color: '#2ecc71' },
    { value: 'Occupied', label: 'Occupied', color: '#3498db' },
    { value: 'Maintenance', label: 'Maintenance', color: '#e74c3c' },
    { value: 'Closed', label: 'Closed', color: '#95a5a6' }
  ];
  
  terminalFilterOptions = [
    { value: 'all', label: 'All Terminals' },
    { value: 'T1', label: 'Terminal 1' },
    { value: 'T2', label: 'Terminal 2' },
    { value: 'T3', label: 'Terminal 3' },
    { value: 'T4', label: 'Terminal 4' }
  ];

  // Data
  gates: GateStatus[] = [];
  availableFlights: FlightStatus[] = [];
  isLoading = false;
  autoRefresh = true;
  viewMode: 'table' | 'grid' | 'visual' = 'table';
  
  // Statistics
  statistics = {
    totalGates: 0,
    availableGates: 0,
    occupiedGates: 0,
    maintenanceGates: 0,
    closedGates: 0,
    occupancyRate: 0
  };

  // Subscriptions
  private dataSubscription!: Subscription;
  private refreshSubscription!: Subscription;
  private formSubscription!: Subscription;

  constructor(
    private airportDataService: AirportDataService,
    private gateService: GateService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      status: ['all'],
      terminal: ['all'],
      gateNumber: [''],
      flightNumber: ['']
    });
  }

  ngOnInit(): void {
    this.loadGatesData();
    this.setupAutoRefresh();
    this.setupFormListeners();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.setupCustomFilter();
  }

  loadGatesData(): void {
    this.isLoading = true;
    
    this.airportDataService.getGateStatus().subscribe({
      next: (gates) => {
        this.gates = gates;
        this.dataSource.data = gates;
        this.updateStatistics();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading gate data:', error);
        this.snackBar.open('Failed to load gate data', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });

    this.loadAvailableFlights();
  }

  loadAvailableFlights(): void {
    this.airportDataService.getFlightStatus().subscribe({
      next: (flights) => {
        // Filter flights that need gate assignment
        this.availableFlights = flights.filter(flight => 
          (flight.status === 'On Time' || flight.status === 'Delayed') && 
          !flight.gate
        );
      },
      error: (error) => {
        console.error('Error loading flights:', error);
      }
    });
  }

  setupAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(10000).subscribe(() => {
        this.loadGatesData();
      });
    }
  }

  setupFormListeners(): void {
    this.formSubscription = this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(filters => {
        this.applyFilters(filters);
      });
  }

  setupCustomFilter(): void {
    this.dataSource.filterPredicate = (gate: GateStatus, filter: string) => {
      const filters = JSON.parse(filter);
      let matches: boolean = true;

      // Search filter
      if (filters.search) {
        const searchStr = filters.search.toLowerCase();
        matches = matches && (
          gate.gateNumber.toLowerCase().includes(searchStr) ||
          gate.terminal.toLowerCase().includes(searchStr) ||
          (gate.currentFlight && gate.currentFlight.toLowerCase().includes(searchStr)) ||
          (gate.nextFlight && gate.nextFlight.toLowerCase().includes(searchStr))
        );
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        matches = matches && gate.status === filters.status;
      }

      // Terminal filter
      if (filters.terminal && filters.terminal !== 'all') {
        matches = matches && gate.terminal === filters.terminal;
      }

      // Gate number filter
      if (filters.gateNumber) {
        matches = matches && gate.gateNumber.toLowerCase().includes(filters.gateNumber.toLowerCase());
      }

      // Flight number filter
      if (filters.flightNumber) {
        const flightMatch = (gate.currentFlight && gate.currentFlight.toLowerCase().includes(filters.flightNumber.toLowerCase())) ||
                          (gate.nextFlight && gate.nextFlight.toLowerCase().includes(filters.flightNumber.toLowerCase()));
        matches = matches && flightMatch;
      }

      return matches;
    };
  }

  applyFilters(filters: any): void {
    this.dataSource.filter = JSON.stringify(filters);
    
    // Update paginator
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      search: '',
      status: 'all',
      terminal: 'all',
      gateNumber: '',
      flightNumber: ''
    });
    
    this.selection.clear();
  }

  updateStatistics(): void {
    this.statistics.totalGates = this.gates.length;
    this.statistics.availableGates = this.gates.filter(gate => gate.status === 'Available').length;
    this.statistics.occupiedGates = this.gates.filter(gate => gate.status === 'Occupied').length;
    this.statistics.maintenanceGates = this.gates.filter(gate => gate.status === 'Maintenance').length;
    this.statistics.closedGates = this.gates.filter(gate => gate.status === 'Closed').length;
    this.statistics.occupancyRate = this.statistics.totalGates > 0 ? 
      Math.round((this.statistics.occupiedGates / this.statistics.totalGates) * 100) : 0;
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected === numRows;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.filteredData);
  }

  // Gate operations
  openGateAssignment(gate?: GateStatus): void {
    const dialogRef = this.dialog.open(GateAssignmentDialog, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        gate: gate || this.createNewGate(),
        availableFlights: this.availableFlights
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.handleGateAssignment(result.assignment);
      }
    });
  }

  createNewGate(): GateStatus {
    // Find the next available gate number
    const existingGateNumbers = this.gates.map(gate => gate.gateNumber);
    let gateNumber = 'A1';
    let counter = 1;
    
    while (existingGateNumbers.includes(gateNumber)) {
      gateNumber = `A${counter}`;
      counter++;
    }
    
    return {
      id: `GATE-${Date.now()}`,
      gateNumber: gateNumber,
      terminal: 'T1',
      status: 'Available',
      currentFlight: undefined,
      nextFlight: undefined,
      nextFlightTime: undefined
    };
  }

  handleGateAssignment(assignment: any): void {
    this.gateService.updateGateAssignment(assignment).subscribe({
      next: (updatedGate) => {
        this.snackBar.open('Gate assignment updated successfully', 'Close', { duration: 3000 });
        this.loadGatesData();
      },
      error: (error) => {
        console.error('Error updating gate assignment:', error);
        this.snackBar.open('Failed to update gate assignment', 'Close', { duration: 3000 });
      }
    });
  }

  openBulkOperation(): void {
    const selectedGates = this.selection.selected;
    
    if (selectedGates.length === 0) {
      this.snackBar.open('Please select gates for bulk operation', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(BulkGateOperationDialog, {
      width: '600px',
      data: { gates: selectedGates }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.saved) {
        this.handleBulkOperation(result.operation, result.gates);
      }
    });
  }

  handleBulkOperation(operation: string, gates: GateStatus[]): void {
    this.gateService.performBulkOperation(operation, gates).subscribe({
      next: () => {
        this.snackBar.open(`Bulk operation completed for ${gates.length} gates`, 'Close', { duration: 3000 });
        this.loadGatesData();
        this.selection.clear();
      },
      error: (error) => {
        console.error('Error performing bulk operation:', error);
        this.snackBar.open('Failed to perform bulk operation', 'Close', { duration: 3000 });
      }
    });
  }

  // Quick actions
  setGateStatus(gateId: string, status: string): void {
    this.gateService.updateGateStatus(gateId, status).subscribe({
      next: () => {
        this.snackBar.open(`Gate status updated to ${status}`, 'Close', { duration: 3000 });
        this.loadGatesData();
      },
      error: (error) => {
        console.error('Error updating gate status:', error);
        this.snackBar.open('Failed to update gate status', 'Close', { duration: 3000 });
      }
    });
  }

  releaseGate(gateId: string): void {
    this.gateService.releaseGate(gateId).subscribe({
      next: () => {
        this.snackBar.open('Gate released successfully', 'Close', { duration: 3000 });
        this.loadGatesData();
      },
      error: (error) => {
        console.error('Error releasing gate:', error);
        this.snackBar.open('Failed to release gate', 'Close', { duration: 3000 });
      }
    });
  }

  swapGates(gate1Id: string, gate2Id: string): void {
    this.gateService.swapGates(gate1Id, gate2Id).subscribe({
      next: () => {
        this.snackBar.open('Gates swapped successfully', 'Close', { duration: 3000 });
        this.loadGatesData();
      },
      error: (error) => {
        console.error('Error swapping gates:', error);
        this.snackBar.open('Failed to swap gates', 'Close', { duration: 3000 });
      }
    });
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch(status.toLowerCase()) {
      case 'available': return '#2ecc71';
      case 'occupied': return '#3498db';
      case 'maintenance': return '#e74c3c';
      case 'closed': return '#95a5a6';
      default: return '#7f8c8d';
    }
  }

  getStatusIcon(status: string): string {
    switch(status.toLowerCase()) {
      case 'available': return 'check_circle';
      case 'occupied': return 'flight_takeoff';
      case 'maintenance': return 'build';
      case 'closed': return 'block';
      default: return 'help';
    }
  }

  canReleaseGate(gate: GateStatus): boolean {
    return gate.status === 'Occupied' && !!gate.currentFlight;
  }

  canAssignFlight(gate: GateStatus): boolean {
    return gate.status === 'Available' || gate.status === 'Occupied';
  }

  exportGateData(): void {
    const exportData = {
      gates: this.gates,
      statistics: this.statistics,
      timestamp: new Date().toISOString(),
      filters: this.filterForm.value
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `gate-management-data-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
    
    this.snackBar.open('Gate data exported successfully', 'Close', { duration: 3000 });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    } else if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  changeViewMode(mode: 'table' | 'grid' | 'visual'): void {
    this.viewMode = mode;
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  getGatesByTerminal(terminal: string): GateStatus[] {
    return this.dataSource.filteredData.filter(gate => gate.terminal === terminal);
  }
  
  getGateTooltip(gate: GateStatus): string {
    let tooltip = `Gate ${gate.gateNumber}\n`;
    tooltip += `Terminal: ${gate.terminal}\n`;
    tooltip += `Status: ${gate.status}\n`;
    
    if (gate.currentFlight) {
      tooltip += `Current Flight: ${gate.currentFlight}\n`;
    }
    
    if (gate.nextFlight) {
      tooltip += `Next Flight: ${gate.nextFlight}`;
      if (gate.nextFlightTime) {
        tooltip += ` at ${gate.nextFlightTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      }
    }
    
    return tooltip;
  }
  
  // Add to the filter options for better UX
  getAvailableFlightsForGate(gate: GateStatus): FlightStatus[] {
    // Return flights that can be assigned to this gate
    return this.availableFlights.filter(flight => 
      !flight.gate || flight.gate === gate.gateNumber
    );
  }
  
  // Add to handle gate swapping
  openGateSwapDialog(gate1: GateStatus, gate2: GateStatus): void {
    // Implementation for gate swap dialog
    const swapConfirmed = confirm(`Swap flights between Gate ${gate1.gateNumber} and Gate ${gate2.gateNumber}?`);
    
    if (swapConfirmed) {
      this.swapGates(gate1.id, gate2.id);
    }
  }
  
  // Add to handle quick status changes
  quickStatusChange(gate: GateStatus, newStatus: string): void {
    if (gate.status === newStatus) return;
    
    const confirmMessage = `Change Gate ${gate.gateNumber} status from ${gate.status} to ${newStatus}?`;
    
    if (confirm(confirmMessage)) {
      this.setGateStatus(gate.id, newStatus);
    }
  }
}
