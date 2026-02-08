import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherIntegration } from './weather-integration';

describe('WeatherIntegration', () => {
  let component: WeatherIntegration;
  let fixture: ComponentFixture<WeatherIntegration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WeatherIntegration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherIntegration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
