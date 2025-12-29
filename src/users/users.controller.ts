import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(Role.Admin, Role.SuperAdmin, Role.User)
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.institutionId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = +id;
    // Allow if user is admin/superadmin OR if they are requesting their own profile
    if (req.user.role !== Role.Admin && req.user.role !== Role.SuperAdmin && req.user.userId !== userId) {
      throw new ForbiddenException('You can only view your own profile');
    }
    // Note: If I am requesting my own profile, my institutionId matches. 
    // If I am admin requesting another user, strict query ensures I only see my company's users.
    return this.usersService.findOne(userId, req.user.institutionId);
  }

  @Post()
  @Roles(Role.Admin, Role.SuperAdmin)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user.institutionId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    const userId = +id;
    // Allow if user is admin/superadmin OR if they are updating their own profile
    if (req.user.role !== Role.Admin && req.user.role !== Role.SuperAdmin && req.user.userId !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Prevent non-admins from changing their own role
    if (req.user.role !== Role.Admin && req.user.role !== Role.SuperAdmin && updateUserDto.role) {
      delete updateUserDto.role;
    }

    return this.usersService.update(userId, updateUserDto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.SuperAdmin)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(+id, req.user.institutionId);
  }
}
