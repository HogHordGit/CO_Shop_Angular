import {AfterViewInit, Component, inject} from '@angular/core';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {AuthService} from '../../shared/services/auth.service';
import {Router} from '@angular/router';
import {UsersInterface} from '../../shared/types/admin-panel-users.interface';
import {AdminPanelService} from '../../shared/services/admin-panel.service';
import {userRegURL, userLogURL} from '../../shared/DbLinks/UrlLinks';

@Component({
  selector: 'app-site-nav',
    imports: [
        FormsModule,
        ReactiveFormsModule
    ],
  templateUrl: './site-nav.component.html',
  standalone: true,
  styleUrl: './site-nav.component.scss'
})
export class SiteNavComponent implements AfterViewInit {
  flagReg:Number = 0;
  flagLog:Number = 0;
  baseUserRegURL = userRegURL;
  baseUserLogURL = userLogURL;

  fb = inject(FormBuilder);
  authService = inject(AuthService);
  router = inject(Router);

  checkLogin: boolean = false;

  constructor(private adminPanelService: AdminPanelService) {}

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    login: ['', Validators.required],
    password: ['', Validators.required]
  });
  formLog = this.fb.nonNullable.group({
    login: ['', Validators.required],
    password: ['', Validators.required]
  });

  requestData:UsersInterface = {
    id: 0,
    login: "",
    password: "",
    name: "",
    balance: 0,
    token: ""
  }

  ngAfterViewInit() {
    this.checkLogin = this.authService.isUserLogged();
  }

  onSubmit(): void {

    this.requestData.name = this.form.getRawValue().name;
    this.requestData.login = this.form.getRawValue().login;
    this.requestData.password = this.form.getRawValue().password;

    this.adminPanelService.createData(this.requestData, this.baseUserRegURL).subscribe({
      next: (response) => {
        console.log("response: ", response);
        localStorage.setItem("Utoken", response.user.token);
        this.authService.currentAdminSig.set(response.user);
        this.checkLogin = this.authService.isUserLogged();
        console.log(this.checkLogin);
      },
      error: (err) => {
        console.log(err);
        alert(err.error.message);
      }
    })
  }

  onSubmitLog(): void {
    this.requestData.login = this.formLog.getRawValue().login;
    this.requestData.password = this.formLog.getRawValue().password;

    this.adminPanelService.createData(this.requestData, this.baseUserLogURL).subscribe({
      next: (response) => {
        console.log("response: ", response);
        localStorage.setItem("Utoken", response.user.token);
        this.authService.currentAdminSig.set(response.user);
        this.checkLogin = this.authService.isUserLogged();
      },
      error: (err) => {
        console.log(err);
        console.log(this.requestData);
        alert(err.error.message);
      }
    })
  }

  toggleReg() {
    if (!this.flagReg) {
      this.flagReg = 1;
    } else {
      this.flagReg = 0;
    }
  }
  toggleLog() {
    if (!this.flagLog) {
      this.flagLog = 1;
    } else {
      this.flagLog = 0;
    }
  }
}
