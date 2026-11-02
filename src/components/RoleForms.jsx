// Read by FederatedLearningDashboard's startVmProvisioning once this
// provider signs in with Azure - the VM name is typed in FLSessionStartModal
// on the same page, so sessionStorage is the bridge. (The FL-only Data
// Provider Form that used to live here is replaced by Upload Dataset,
// PolicyForm.jsx - the single data-provider form for every service.)
export const DP_VM_NAME_KEY = 'p3dx_flo_dp_vm_name';
