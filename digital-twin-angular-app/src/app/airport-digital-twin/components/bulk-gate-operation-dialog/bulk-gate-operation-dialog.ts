import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GateStatus } from '../../models/airport-models';

export interface BulkOperationDialogData {
  gates: GateStatus[];
  operationType?: string;
}

export interface BulkOperationResult {
  saved: boolean;
  operation: string;
  parameters: any;
  gates: GateStatus[];
}

@Component({
  selector: 'app-bulk-gate-operation-dialog',
  templateUrl: './bulk-gate-operation-dialog.html',
  standalone: false,
  styleUrls: ['./bulk-gate-operation-dialog.scss']
})
export class BulkGateOperationDialog implements OnInit {
  bulkForm: FormGroup;
  isLoading = false;
  selectedGatesCount = 0;
  
  // Operation types
  operationTypes = [
    { 
      value: 'status_change', 
      label: 'Change Status', 
      icon: 'swap_vert',
      description: 'Change status of selected gates',
      requiresParameters: true
    },
    { 
      value: 'schedule_maintenance', 
      label: 'Schedule Maintenance', 
      icon: 'build',
      description: 'Schedule maintenance for selected gates',
      requiresParameters: true
    },
    { 
      value: 'release_flights', 
      label: 'Release Flights', 
      icon: 'exit_to_app',
      description: 'Release all flights from selected gates',
      requiresParameters: false
    },
    { 
      value: 'assign_flight', 
      label: 'Assign Flight', 
      icon: 'flight_takeoff',
      description: 'Assign same flight to all selected gates',
      requiresParameters: true
    },
    { 
      value: 'set_next_flight', 
      label: 'Set Next Flight', 
      icon: 'schedule',
      description: 'Set next flight for selected gates',
      requiresParameters: true
    },
    { 
      value: 'clear_gates', 
      label: 'Clear Gates', 
      icon: 'clear_all',
      description: 'Clear all flights from selected gates',
      requiresParameters: false
    },
    { 
      value: 'swap_gates', 
      label: 'Swap Gates', 
      icon: 'swap_horiz',
      description: 'Swap flights between selected gates',
      requiresParameters: false
    }
  ];
  
  // Status options
  statusOptions = [
    { value: 'Available', label: 'Available', color: '#2ecc71', icon: 'check_circle' },
    { value: 'Occupied', label: 'Occupied', color: '#3498db', icon: 'flight_takeoff' },
    { value: 'Maintenance', label: 'Maintenance', color: '#e74c3c', icon: 'build' },
    { value: 'Closed', label: 'Closed', color: '#95a5a6', icon: 'block' }
  ];
  
  // Maintenance reasons
  maintenanceReasons = [
    'Routine Maintenance',
    'Equipment Repair',
    'Cleaning',
    'Technical Issue',
    'Safety Inspection',
    'Renovation',
    'Weather Related',
    'Other'
  ];
  
  // Maintenance durations
  maintenanceDurations = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '1 day' },
    { value: 2880, label: '2 days' }
  ];
  
  // Flight options (would come from service in real app)
  availableFlights = [
    'DL123', 'AA456', 'UA789', 'B6123', 'WN456', 'AS789',
    'DL234', 'AA567', 'UA890', 'B6234', 'WN567', 'AS890'
  ];
  
  // Airlines
  airlines = [
    'Delta Airlines',
    'American Airlines',
    'United Airlines',
    'JetBlue',
    'Southwest Airlines',
    'Alaska Airlines',
    'Spirit Airlines',
    'Frontier Airlines'
  ];
  
  // Destinations
  destinations = [
    'ATL - Atlanta',
    'LAX - Los Angeles',
    'ORD - Chicago',
    'DFW - Dallas/Fort Worth',
    'DEN - Denver',
    'JFK - New York',
    'SFO - San Francisco',
    'SEA - Seattle',
    'MIA - Miami',
    'LAS - Las Vegas'
  ];
  
  // Gate statistics
  gateStats = {
    total: 0,
    byStatus: {
      Available: 0,
      Occupied: 0,
      Maintenance: 0,
      Closed: 0
    },
    byTerminal: {} as Record<string, number>,
    withFlights: 0
  };

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<BulkGateOperationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: BulkOperationDialogData
  ) {
    this.selectedGatesCount = data.gates.length;
    
    this.bulkForm = this.fb.group({
      operationType: [data.operationType || 'status_change', Validators.required],
      
      // Status change parameters
      newStatus: ['Available'],
      
      // Maintenance parameters
      maintenanceReason: ['Routine Maintenance'],
      maintenanceDuration: [60],
      maintenanceNotes: [''],
      
      // Flight assignment parameters
      flightNumber: [''],
      airline: [''],
      destination: [''],
      scheduledTime: [''],
      estimatedTime: [''],
      flightStatus: ['On Time'],
      
      // Next flight parameters
      nextFlightNumber: [''],
      nextFlightTime: [''],
      
      // Confirmation
      confirmation: [false, Validators.requiredTrue],
      sendNotification: [true],
      notifyTeams: [[]],
      
      // Schedule parameters
      scheduleImmediately: [true],
      scheduledDateTime: [''],
      
      // Notes
      operationNotes: ['']
    });
    
    this.calculateGateStats();
  }

  ngOnInit(): void {
    this.setupFormListeners();
    this.updateFormValidation();
  }

  setupFormListeners(): void {
    // Update form validation when operation type changes
    this.bulkForm.get('operationType')?.valueChanges.subscribe(operationType => {
      this.updateFormValidation();
      this.updateOperationDescription();
    });
    
    // Update flight info when flight number changes
    this.bulkForm.get('flightNumber')?.valueChanges.subscribe(flightNumber => {
      this.autoFillFlightInfo(flightNumber);
    });
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  updateFormValidation(): void {
    const operationType = this.bulkForm.get('operationType')?.value;
    const operation = this.operationTypes.find(op => op.value === operationType);
    
    // Reset all validators
    Object.keys(this.bulkForm.controls).forEach(key => {
      if (key !== 'operationType' && key !== 'confirmation' && key !== 'sendNotification') {
        this.bulkForm.get(key)?.clearValidators();
        this.bulkForm.get(key)?.updateValueAndValidity();
      }
    });
    
    // Set validators based on operation type
    if (operation?.requiresParameters) {
      switch (operationType) {
        case 'status_change':
          this.bulkForm.get('newStatus')?.setValidators([Validators.required]);
          break;
          
        case 'schedule_maintenance':
          this.bulkForm.get('maintenanceReason')?.setValidators([Validators.required]);
          this.bulkForm.get('maintenanceDuration')?.setValidators([Validators.required, Validators.min(15)]);
          break;
          
        case 'assign_flight':
          this.bulkForm.get('flightNumber')?.setValidators([Validators.required]);
          this.bulkForm.get('airline')?.setValidators([Validators.required]);
          this.bulkForm.get('destination')?.setValidators([Validators.required]);
          break;
          
        case 'set_next_flight':
          this.bulkForm.get('nextFlightNumber')?.setValidators([Validators.required]);
          this.bulkForm.get('nextFlightTime')?.setValidators([Validators.required]);
          break;
      }
    }
    
    // Update validity
    Object.keys(this.bulkForm.controls).forEach(key => {
      this.bulkForm.get(key)?.updateValueAndValidity();
    });
  }

  calculateGateStats(): void {
    this.gateStats.total = this.data.gates.length;
    
    // Reset counts
    this.gateStats.byStatus = { Available: 0, Occupied: 0, Maintenance: 0, Closed: 0 };
    this.gateStats.byTerminal = {};
    this.gateStats.withFlights = 0;
    
    this.data.gates.forEach(gate => {
      // Count by status
      this.gateStats.byStatus[gate.status]++;
      
      // Count by terminal
      if (!this.gateStats.byTerminal[gate.terminal]) {
        this.gateStats.byTerminal[gate.terminal] = 0;
      }
      this.gateStats.byTerminal[gate.terminal]++;
      
      // Count gates with flights
      if (gate.currentFlight) {
        this.gateStats.withFlights++;
      }
    });
  }

  getOperationDescription(): string {
    const operationType = this.bulkForm.get('operationType')?.value;
    const operation = this.operationTypes.find(op => op.value === operationType);
    return operation?.description || 'Select an operation type';
  }

  getOperationIcon(): string {
    const operationType = this.bulkForm.get('operationType')?.value;
    const operation = this.operationTypes.find(op => op.value === operationType);
    return operation?.icon || 'help';
  }

  updateOperationDescription(): void {
    // This method is called when operation type changes
    // Could be used to update a preview or description
  }

  autoFillFlightInfo(flightNumber: string): void {
    if (!flightNumber) return;
    
    // In a real app, this would fetch flight info from a service
    // For now, simulate with mock data
    if (flightNumber.startsWith('DL')) {
      this.bulkForm.patchValue({
        airline: 'Delta Airlines',
        destination: 'ATL - Atlanta'
      });
    } else if (flightNumber.startsWith('AA')) {
      this.bulkForm.patchValue({
        airline: 'American Airlines',
        destination: 'DFW - Dallas/Fort Worth'
      });
    } else if (flightNumber.startsWith('UA')) {
      this.bulkForm.patchValue({
        airline: 'United Airlines',
        destination: 'ORD - Chicago'
      });
    } else if (flightNumber.startsWith('B6')) {
      this.bulkForm.patchValue({
        airline: 'JetBlue',
        destination: 'JFK - New York'
      });
    } else if (flightNumber.startsWith('WN')) {
      this.bulkForm.patchValue({
        airline: 'Southwest Airlines',
        destination: 'DEN - Denver'
      });
    } else if (flightNumber.startsWith('AS')) {
      this.bulkForm.patchValue({
        airline: 'Alaska Airlines',
        destination: 'SEA - Seattle'
      });
    }
    
    // Set default times (current time + 30 minutes)
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 30 * 60000);
    const estimatedTime = new Date(scheduledTime.getTime() + 10 * 60000);
    
    this.bulkForm.patchValue({
      scheduledTime: scheduledTime.toISOString().slice(0, 16),
      estimatedTime: estimatedTime.toISOString().slice(0, 16)
    });
  }

  getStatusColor(status: string): string {
    const statusObj = this.statusOptions.find(s => s.value === status);
    return statusObj?.color || '#95a5a6';
  }

  getStatusIcon(status: string): string {
    const statusObj = this.statusOptions.find(s => s.value === status);
    return statusObj?.icon || 'help';
  }

  getDurationLabel(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} hours`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} days`;
    }
  }

  validateOperation(): boolean {
    const operationType = this.bulkForm.get('operationType')?.value;
    
    // Check if operation is valid for selected gates
    switch (operationType) {
      case 'release_flights':
        const hasOccupiedGates = this.data.gates.some(gate => gate.status === 'Occupied');
        if (!hasOccupiedGates) {
          this.snackBar.open('No occupied gates selected for release', 'Close', { duration: 3000 });
          return false;
        }
        break;
        
      case 'swap_gates':
        if (this.data.gates.length !== 2) {
          this.snackBar.open('Swap operation requires exactly 2 gates', 'Close', { duration: 3000 });
          return false;
        }
        break;
        
      case 'assign_flight':
        const availableGates = this.data.gates.filter(gate => 
          gate.status === 'Available' || gate.status === 'Occupied'
        );
        if (availableGates.length === 0) {
          this.snackBar.open('No available or occupied gates selected for flight assignment', 'Close', { duration: 3000 });
          return false;
        }
        break;
    }
    
    return true;
  }

  getOperationSummary(): any {
    const formValue = this.bulkForm.value;
    const operationType = formValue.operationType;
    const operation = this.operationTypes.find(op => op.value === operationType);
    
    const summary = {
      operation: operation?.label || 'Unknown Operation',
      gatesAffected: this.selectedGatesCount,
      parameters: {},
      impact: this.calculateOperationImpact()
    };
    
    // Add operation-specific parameters
    switch (operationType) {
      case 'status_change':
        summary.parameters = {
          newStatus: formValue.newStatus,
          fromStatus: this.getCurrentStatusDistribution()
        };
        break;
        
      case 'schedule_maintenance':
        summary.parameters = {
          reason: formValue.maintenanceReason,
          duration: this.getDurationLabel(formValue.maintenanceDuration),
          notes: formValue.maintenanceNotes
        };
        break;
        
      case 'assign_flight':
        summary.parameters = {
          flightNumber: formValue.flightNumber,
          airline: formValue.airline,
          destination: formValue.destination,
          scheduledTime: formValue.scheduledTime
        };
        break;
        
      case 'set_next_flight':
        summary.parameters = {
          nextFlight: formValue.nextFlightNumber,
          nextFlightTime: formValue.nextFlightTime
        };
        break;
        
      case 'release_flights':
        summary.parameters = {
          flightsToRelease: this.gateStats.withFlights
        };
        break;
        
      case 'clear_gates':
        summary.parameters = {
          clearFlights: this.gateStats.withFlights,
          clearNextFlights: this.data.gates.filter(g => g.nextFlight).length
        };
        break;
        
      case 'swap_gates':
        const gateNames = this.data.gates.map(g => g.gateNumber);
        summary.parameters = {
          gatesToSwap: gateNames.join(' ↔ ')
        };
        break;
    }
    
    return summary;
  }

  getCurrentStatusDistribution(): any {
    return {
      Available: this.gateStats.byStatus.Available,
      Occupied: this.gateStats.byStatus.Occupied,
      Maintenance: this.gateStats.byStatus.Maintenance,
      Closed: this.gateStats.byStatus.Closed
    };
  }

  calculateOperationImpact(): string {
    const operationType = this.bulkForm.get('operationType')?.value;
    
    switch (operationType) {
      case 'status_change':
        const newStatus = this.bulkForm.get('newStatus')?.value;
        return `Change ${this.selectedGatesCount} gates to ${newStatus} status`;
        
      case 'schedule_maintenance':
        const duration = this.bulkForm.get('maintenanceDuration')?.value;
        return `Take ${this.selectedGatesCount} gates offline for ${this.getDurationLabel(duration)}`;
        
      case 'assign_flight':
        return `Assign flight to ${this.selectedGatesCount} gates`;
        
      case 'release_flights':
        return `Release flights from ${this.gateStats.withFlights} gates`;
        
      case 'clear_gates':
        return `Clear all flight assignments from ${this.selectedGatesCount} gates`;
        
      case 'swap_gates':
        return `Swap flights between 2 gates`;
        
      default:
        return `Perform operation on ${this.selectedGatesCount} gates`;
    }
  }

  executeOperation(): void {
    if (!this.validateOperation() || !this.bulkForm.valid) {
      return;
    }

    this.isLoading = true;
    
    const formValue = this.bulkForm.value;
    const operationType = formValue.operationType;
    
    // Prepare operation parameters
    const operation = {
      operation: operationType,
      parameters: this.getOperationParameters(formValue),
      gates: this.data.gates
    };
    
    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      
      const result: BulkOperationResult = {
        saved: true,
        operation: operationType,
        parameters: operation.parameters,
        gates: this.data.gates
      };
      
      this.snackBar.open(`Bulk operation completed successfully on ${this.selectedGatesCount} gates`, 'Close', { duration: 3000 });
      this.dialogRef.close(result);
    }, 1500);
  }

  getOperationParameters(formValue: any): any {
    const params: any = {};
    
    switch (formValue.operationType) {
      case 'status_change':
        params.newStatus = formValue.newStatus;
        break;
        
      case 'schedule_maintenance':
        params.reason = formValue.maintenanceReason;
        params.duration = formValue.maintenanceDuration;
        params.notes = formValue.maintenanceNotes;
        params.scheduleImmediately = formValue.scheduleImmediately;
        if (!formValue.scheduleImmediately && formValue.scheduledDateTime) {
          params.scheduledDateTime = formValue.scheduledDateTime;
        }
        break;
        
      case 'assign_flight':
        params.flightNumber = formValue.flightNumber;
        params.airline = formValue.airline;
        params.destination = formValue.destination;
        params.scheduledTime = formValue.scheduledTime;
        params.estimatedTime = formValue.estimatedTime;
        params.flightStatus = formValue.flightStatus;
        break;
        
      case 'set_next_flight':
        params.nextFlightNumber = formValue.nextFlightNumber;
        params.nextFlightTime = formValue.nextFlightTime;
        break;
        
      case 'release_flights':
        params.releaseAll = true;
        break;
        
      case 'clear_gates':
        params.clearCurrentFlights = true;
        params.clearNextFlights = true;
        break;
        
      case 'swap_gates':
        params.swapAll = true;
        break;
    }
    
    // Add common parameters
    params.sendNotification = formValue.sendNotification;
    params.notifyTeams = formValue.notifyTeams;
    params.operationNotes = formValue.operationNotes;
    
    return params;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getSelectedGatesPreview(): GateStatus[] {
    // Return first few gates for preview
    return this.data.gates.slice(0, 3);
  }

  getAffectedTerminals(): string[] {
    return Object.keys(this.gateStats.byTerminal);
  }

  getOperationImpactLevel(): 'low' | 'medium' | 'high' {
    const operationType = this.bulkForm.get('operationType')?.value;
    
    switch (operationType) {
      case 'status_change':
        const newStatus = this.bulkForm.get('newStatus')?.value;
        if (newStatus === 'Maintenance' || newStatus === 'Closed') {
          return 'high';
        }
        return 'medium';
        
      case 'schedule_maintenance':
      case 'assign_flight':
      case 'swap_gates':
        return 'high';
        
      case 'release_flights':
      case 'clear_gates':
      case 'set_next_flight':
        return 'medium';
        
      default:
        return 'low';
    }
  }

  getImpactLevelColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low': return '#2ecc71';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      default: return '#95a5a6';
    }
  }

  getImpactLevelIcon(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low': return 'check_circle';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'help';
    }
  }

  formatGateList(): string {
    if (this.selectedGatesCount <= 3) {
      return this.data.gates.map(g => g.gateNumber).join(', ');
    }
    const firstThree = this.data.gates.slice(0, 3).map(g => g.gateNumber).join(', ');
    return `${firstThree} and ${this.selectedGatesCount - 3} more`;
  }
}
