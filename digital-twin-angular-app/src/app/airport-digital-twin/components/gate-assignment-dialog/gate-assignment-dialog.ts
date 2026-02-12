import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GateStatus, FlightStatus } from '../../models/airport-models';
import { AirportDataService } from '../../services/airport-data.service';

export interface GateAssignmentDialogData {
  gate: GateStatus;
  availableFlights?: FlightStatus[];
}

export interface GateAssignment {
  gateId: string;
  flightId?: string;
  flightNumber?: string;
  gateStatus: string;
  flightStatus?: string;
  airline?: string;
  destination?: string;
  scheduledTime?: Date;
  estimatedTime?: Date;
  status?: string;
  nextFlightNumber?: string;
  nextFlightTime?: Date;
  assignToNext?: boolean;
  maintenanceReason?: string;
  maintenanceDuration?: number; // in minutes
  notes?: string;
}

@Component({
  selector: 'app-gate-assignment-dialog',
  templateUrl: './gate-assignment-dialog.html',
  standalone: false,
  styleUrls: ['./gate-assignment-dialog.scss']
})
export class GateAssignmentDialog implements OnInit {
  assignmentForm: FormGroup;
  isLoading = false;
  availableFlights: FlightStatus[] = [];
  
  // Gate status options
  gateStatuses = [
    { value: 'Available', label: 'Available', icon: 'check_circle', color: '#2ecc71' },
    { value: 'Occupied', label: 'Occupied', icon: 'flight_takeoff', color: '#3498db' },
    { value: 'Maintenance', label: 'Maintenance', icon: 'build', color: '#e74c3c' },
    { value: 'Closed', label: 'Closed', icon: 'block', color: '#95a5a6' }
  ];
  
  // Flight status options
  flightStatuses = [
    { value: 'On Time', label: 'On Time', icon: 'schedule', color: '#2ecc71' },
    { value: 'Delayed', label: 'Delayed', icon: 'schedule', color: '#e74c3c' },
    { value: 'Boarding', label: 'Boarding', icon: 'flight_takeoff', color: '#3498db' },
    { value: 'Departed', label: 'Departed', icon: 'flight', color: '#9b59b6' },
    { value: 'Arrived', label: 'Arrived', icon: 'flight_land', color: '#2ecc71' }
  ];
  
  // Maintenance reasons
  maintenanceReasons = [
    'Routine Maintenance',
    'Equipment Repair',
    'Cleaning',
    'Technical Issue',
    'Safety Inspection',
    'Renovation',
    'Other'
  ];
  
  // Airlines
  airlines = [
    'Delta Airlines',
    'American Airlines',
    'United Airlines',
    'JetBlue',
    'Southwest',
    'Alaska Airlines',
    'Spirit Airlines',
    'Frontier Airlines'
  ];

  constructor(
    private fb: FormBuilder,
    private airportDataService: AirportDataService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<GateAssignmentDialog>,
    @Inject(MAT_DIALOG_DATA) public data: GateAssignmentDialogData
  ) {
    this.assignmentForm = this.fb.group({
      gateStatus: [data.gate.status, Validators.required],
      flightNumber: [data.gate.currentFlight || ''],
      airline: [''],
      destination: [''],
      scheduledTime: [''],
      estimatedTime: [''],
      flightStatus: ['On Time'],
      assignToNext: [false],
      nextFlightNumber: [data.gate.nextFlight || ''],
      nextFlightTime: [data.gate.nextFlightTime || ''],
      maintenanceReason: [''],
      maintenanceDuration: [60],
      maintenanceNotes: [''],
      notes: ['']
    });
    
    // Set initial values based on current gate status
    this.onStatusChange(data.gate.status);
  }

  ngOnInit(): void {
    this.loadAvailableFlights();
    this.setupFormListeners();
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
        this.snackBar.open('Failed to load available flights', 'Close', { duration: 3000 });
      }
    });
  }

  setupFormListeners(): void {
    // Listen for gate status changes
    this.assignmentForm.get('gateStatus')?.valueChanges.subscribe(status => {
      this.onStatusChange(status);
    });
    
    // Listen for flight selection
    this.assignmentForm.get('flightNumber')?.valueChanges.subscribe(flightNumber => {
      this.onFlightSelect(flightNumber);
    });
  }

  onStatusChange(status: string): void {
    // Enable/disable fields based on gate status
    const flightControls = ['flightNumber', 'airline', 'destination', 'scheduledTime', 'estimatedTime', 'flightStatus'];
    const maintenanceControls = ['maintenanceReason', 'maintenanceDuration', 'maintenanceNotes'];
    
    if (status === 'Occupied') {
      flightControls.forEach(control => {
        this.assignmentForm.get(control)?.enable();
      });
      maintenanceControls.forEach(control => {
        this.assignmentForm.get(control)?.disable();
      });
    } else if (status === 'Maintenance') {
      flightControls.forEach(control => {
        this.assignmentForm.get(control)?.disable();
      });
      maintenanceControls.forEach(control => {
        this.assignmentForm.get(control)?.enable();
      });
    } else {
      // Available or Closed
      flightControls.forEach(control => {
        this.assignmentForm.get(control)?.disable();
      });
      maintenanceControls.forEach(control => {
        this.assignmentForm.get(control)?.disable();
      });
    }
  }

  onFlightSelect(flightNumber: string): void {
    if (!flightNumber) return;
    
    // Find flight details
    const flight = this.availableFlights.find(f => f.flightNumber === flightNumber);
    if (flight) {
      this.assignmentForm.patchValue({
        airline: flight.airline,
        destination: flight.destination,
        scheduledTime: flight.scheduledTime,
        estimatedTime: flight.estimatedTime,
        flightStatus: flight.status
      });
    }
  }

  getStatusColor(status: string): string {
    const statusObj = this.gateStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : '#95a5a6';
  }

  getStatusIcon(status: string): string {
    const statusObj = this.gateStatuses.find(s => s.value === status);
    return statusObj ? statusObj.icon : 'help';
  }

  getFlightStatusColor(status: string): string {
    const statusObj = this.flightStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : '#95a5a6';
  }

  calculateDelay(): number {
    const scheduled = this.assignmentForm.get('scheduledTime')?.value;
    const estimated = this.assignmentForm.get('estimatedTime')?.value;
    
    if (!scheduled || !estimated) return 0;
    
    const scheduledTime = new Date(scheduled).getTime();
    const estimatedTime = new Date(estimated).getTime();
    
    return Math.round((estimatedTime - scheduledTime) / (1000 * 60)); // minutes
  }

  validateAssignment(): boolean {
    const status = this.assignmentForm.get('gateStatus')?.value;
    
    if (status === 'Occupied') {
      const flightNumber = this.assignmentForm.get('flightNumber')?.value;
      if (!flightNumber) {
        this.snackBar.open('Please select a flight for occupied gate', 'Close', { duration: 3000 });
        return false;
      }
    }
    
    if (status === 'Maintenance') {
      const reason = this.assignmentForm.get('maintenanceReason')?.value;
      if (!reason) {
        this.snackBar.open('Please specify maintenance reason', 'Close', { duration: 3000 });
        return false;
      }
    }
    
    return true;
  }

  saveAssignment(): void {
    if (!this.validateAssignment() || !this.assignmentForm.valid) {
      return;
    }

    this.isLoading = true;
    
    const formValue = this.assignmentForm.value;
    const assignment: GateAssignment = {
      gateId: this.data.gate.id,
      gateStatus: formValue.gateStatus,
      flightNumber: formValue.flightNumber,
      airline: formValue.airline,
      destination: formValue.destination,
      scheduledTime: formValue.scheduledTime,
      estimatedTime: formValue.estimatedTime,
      flightStatus: formValue.flightStatus,
      assignToNext: formValue.assignToNext,
      nextFlightNumber: formValue.nextFlightNumber,
      nextFlightTime: formValue.nextFlightTime,
      maintenanceReason: formValue.maintenanceReason,
      maintenanceDuration: formValue.maintenanceDuration,
      notes: formValue.notes
    };
    
    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      
      this.snackBar.open('Gate assignment updated successfully', 'Close', { duration: 3000 });
      
      this.dialogRef.close({
        saved: true,
        assignment: assignment,
        refresh: true
      });
    }, 1000);
  }

  close(): void {
    this.dialogRef.close();
  }

  clearFlight(): void {
    this.assignmentForm.patchValue({
      flightNumber: '',
      airline: '',
      destination: '',
      scheduledTime: '',
      estimatedTime: '',
      flightStatus: 'On Time'
    });
  }

  swapFlights(): void {
    const currentFlight = this.assignmentForm.get('flightNumber')?.value;
    const nextFlight = this.assignmentForm.get('nextFlightNumber')?.value;
    
    if (currentFlight && nextFlight) {
      this.assignmentForm.patchValue({
        flightNumber: nextFlight,
        nextFlightNumber: currentFlight
      });
    }
  }

  getFlightDuration(): string {
    const duration = this.assignmentForm.get('maintenanceDuration')?.value || 60;
    
    if (duration < 60) {
      return `${duration} minutes`;
    } else if (duration < 1440) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    } else {
      const days = Math.floor(duration / 1440);
      return `${days} days`;
    }
  }

  getAvailableGates(): string[] {
    // This would come from a service in a real implementation
    return ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
  }

  reassignToOtherGate(): void {
    const availableGates = this.getAvailableGates();
    const currentGate = this.data.gate.gateNumber;
    const otherGates = availableGates.filter(gate => gate !== currentGate);
    
    if (otherGates.length > 0) {
      const randomGate = otherGates[Math.floor(Math.random() * otherGates.length)];
      this.snackBar.open(`Consider reassigning to Gate ${randomGate}`, 'Close', { duration: 4000 });
    }
  }
}