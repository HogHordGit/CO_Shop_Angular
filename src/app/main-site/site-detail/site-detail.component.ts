import {
  Component,
  DestroyRef,
  OnInit
} from '@angular/core';

import { mainSiteParticularItem } from
    '../../shared/DbLinks/UrlLinks';

import { AdminPanelService } from
    '../../shared/services/admin-panel.service';

import { ClothesInterface } from
    '../../shared/types/admin-panel-clothes.interface';

import { AnalyticsService } from
    '../../shared/services/analytics.service';

import { ActivatedRoute } from '@angular/router';

import { CommonModule } from '@angular/common';

import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap
} from 'rxjs';

import { takeUntilDestroyed } from
    '@angular/core/rxjs-interop';

@Component({
  selector: 'app-site-detail',
  imports: [CommonModule],
  templateUrl: './site-detail.component.html',
  standalone: true,
  styleUrl: './site-detail.component.scss'
})
export class SiteDetailComponent implements OnInit {

  baseAdminListURL = mainSiteParticularItem;

  clothItem: ClothesInterface[] = [];

  constructor(
    private adminPanelService: AdminPanelService,
    private route: ActivatedRoute,
    private analyticsService: AnalyticsService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {

    this.route.paramMap.pipe(

      // Отримання ID товару з URL
      map(params => Number(params.get('id'))),

      distinctUntilChanged(),

      // Завантаження інформації про товар
      switchMap(productId => {

        this.clothItem = [];

        if (
          !Number.isInteger(productId) ||
          productId <= 0
        ) {
          return of({
            productId,
            data: []
          });
        }

        return this.adminPanelService
          .fetchParticularData(
            productId,
            this.baseAdminListURL
          ).pipe(

            map(data => ({
              productId,
              data
            })),

            catchError(error => {

              console.error(
                'Product loading error:',
                error
              );

              return of({
                productId,
                data: []
              });
            })
          );
      }),

      takeUntilDestroyed(this.destroyRef)

    ).subscribe(({ productId, data }) => {

      this.clothItem = data;

      // Реєстрація перегляду існуючого товару
      if (this.clothItem.length > 0) {

        const pageUrl = `/home/detail/${productId}`;

        this.analyticsService.trackEvent(
          'product_view',
          pageUrl,
          productId
        );

        this.analyticsService.startProductTracking(
          productId,
          pageUrl
        );
      }

      console.log(this.clothItem);
    });
  }
}
