export interface PackageRef {
  id: string
  name: string
  slug: string
}

export class AddOnDependenciesDto {
  packages_using!: PackageRef[]
}
