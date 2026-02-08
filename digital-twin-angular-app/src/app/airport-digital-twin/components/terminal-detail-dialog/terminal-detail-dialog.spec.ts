import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalDetailDialog } from './terminal-detail-dialog';

describe('TerminalDetailDialog', () => {
  let component: TerminalDetailDialog;
  let fixture: ComponentFixture<TerminalDetailDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TerminalDetailDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TerminalDetailDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
