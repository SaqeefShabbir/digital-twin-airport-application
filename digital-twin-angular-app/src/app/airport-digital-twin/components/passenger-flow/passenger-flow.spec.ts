import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassengerFlow } from './passenger-flow';

describe('PassengerFlow', () => {
  let component: PassengerFlow;
  let fixture: ComponentFixture<PassengerFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PassengerFlow]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassengerFlow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
