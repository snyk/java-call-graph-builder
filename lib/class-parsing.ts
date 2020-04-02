export function removeParams(functionCall: string): string {
  // com/ibm/wala/FakeRootClass.fakeRootMethod:()V
  return functionCall.split(':')[0];
}

export function toFQclassName(functionCall: string) {
  // com/ibm/wala/FakeRootClass.fakeRootMethod -> com.ibm.wala.FakeRootClass:fakeRootMethod
  return functionCall.replace('.', ':').replace(/\//g, '.');
}
