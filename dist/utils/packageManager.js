import { packageManagers } from '../utils';
import { cmdExists } from './scripts';
export default async function getPackageManagers() {
    let result = [];
    for (let i = 0; i < packageManagers.length; i++) {
        const manager = packageManagers[i];
        if (await cmdExists(manager)) {
            result.push(manager);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvcGFja2FnZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFtQixlQUFlLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUVyQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssVUFBVSxrQkFBa0I7SUFDOUMsSUFBSSxNQUFNLEdBQXNCLEVBQUUsQ0FBQTtJQUVsQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMvQyxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEMsSUFBSSxNQUFNLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1NBQ3JCO0tBQ0Y7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNmLENBQUMifQ==