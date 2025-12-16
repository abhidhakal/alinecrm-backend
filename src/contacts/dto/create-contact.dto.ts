
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsEnum(['High', 'Medium', 'Low'])
  @IsOptional()
  priority?: string;
}
