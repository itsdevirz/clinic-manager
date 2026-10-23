declare module 'melipayamak-2' {
  const MelipayamakApi: new (username: string, password: string) => {
    sms(type?: string, mode?: string): {
      send(to: string | string[], from: string, text: string, isFlash?: boolean): Promise<unknown>;
    };
  };

  export default MelipayamakApi;
  export { MelipayamakApi };
}
