using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class sceneSwitcher : MonoBehaviour
{
    public void GotoMainScene()
    {
        SceneManager.LoadScene("LoadingScene");
    }

    public void GotoCreditScene()
    {
        SceneManager.LoadScene("credit_scene");
    }

    public void Quit()
    {
        //If we are running in a standalone build of the game
        #if UNITY_STANDALONE
                //Quit the application
                Application.Quit();
        #endif

                //If we are running in the editor
        #if UNITY_EDITOR
                //Stop playing the scene
                UnityEditor.EditorApplication.isPlaying = false;
        #endif
    }
}
