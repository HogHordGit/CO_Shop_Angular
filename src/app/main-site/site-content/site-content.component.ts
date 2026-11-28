import { Component, OnInit, DestroyRef } from '@angular/core';
import { AdminPanelService } from '../../shared/services/admin-panel.service';
import { adminPanelClothesURL } from '../../shared/DbLinks/UrlLinks';
import { ClothesInterface } from '../../shared/types/admin-panel-clothes.interface';
import { CommonModule } from '@angular/common';

import {
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { takeUntilDestroyed } from
    '@angular/core/rxjs-interop';

@Component({
  selector: 'app-site-content',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './site-content.component.html',
  standalone: true,
  styleUrl: './site-content.component.scss'
})
export class SiteContentComponent implements OnInit {

  baseAdminListURL: String = adminPanelClothesURL;

  flagAllNewGoods: boolean = false;
  flagAllTopGoods: boolean = false;

  clothes: ClothesInterface[] = [];

  filteredNewClothes: ClothesInterface[] = [];
  filteredTopClothes: ClothesInterface[] = [];

  visibleNewClothes: ClothesInterface[] = [];
  visibleTopClothes: ClothesInterface[] = [];

  constructor(
    private adminPanelService: AdminPanelService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.loadClothes();
  }

  // Завантаження товарів із серверної частини
  private loadClothes(): void {

    this.adminPanelService
      .fetchAllData(this.baseAdminListURL)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: (data: ClothesInterface[]) => {

          this.clothes = data;

          // Нові товари
          this.filteredNewClothes =
            this.clothes.filter(
              item => item.rating === 'new'
            );

          // Популярні товари
          this.filteredTopClothes =
            this.clothes.filter(
              item => item.rating === 'top'
            );

          // Відображення перших чотирьох товарів
          this.visibleNewClothes =
            this.filteredNewClothes.slice(0, 4);

          this.visibleTopClothes =
            this.filteredTopClothes.slice(0, 4);
        },

        error: (error) => {
          console.error(
            'Error loading clothes:',
            error
          );
        }
      });
  }

  // Кнопка View All / View Less для NEW ARRIVALS
  btnEventNew(): void {

    this.flagAllNewGoods = !this.flagAllNewGoods;

    this.visibleNewClothes = this.flagAllNewGoods
      ? this.filteredNewClothes
      : this.filteredNewClothes.slice(0, 4);
  }

  // Кнопка View All / View Less для TOP SELLING
  btnEventTop(): void {

    this.flagAllTopGoods = !this.flagAllTopGoods;

    this.visibleTopClothes = this.flagAllTopGoods
      ? this.filteredTopClothes
      : this.filteredTopClothes.slice(0, 4);
  }
}
